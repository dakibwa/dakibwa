import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const healthDataPath = path.join(repoRoot, "data/health-data.json");
const publicHealthDataPath = path.join(repoRoot, "data/public-health-data.json");
const sourceHealthDataPath = fs.existsSync(healthDataPath) ? healthDataPath : publicHealthDataPath;
const whoopDirEnv = process.env.WHOOP_ARCHIVE_DIR?.trim();
const whoopClientId = process.env.WHOOP_CLIENT_ID?.trim();
const whoopClientSecret = process.env.WHOOP_CLIENT_SECRET?.trim();
const whoopRefreshToken = process.env.WHOOP_REFRESH_TOKEN?.trim();
const whoopApiDays = Number(process.env.WHOOP_API_DAYS || 45);

if (!whoopDirEnv && (!whoopClientId || !whoopClientSecret || !whoopRefreshToken)) {
  throw new Error(
    "Set WHOOP_ARCHIVE_DIR for a local archive refresh, or WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REFRESH_TOKEN for a direct API refresh."
  );
}

const whoopDir = whoopDirEnv ? path.resolve(whoopDirEnv) : null;
const WHOOP_API = "https://api.prod.whoop.com/developer";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const USER_AGENT = "akibwa-vitals-refresh/1";

const COLLECTIONS = {
  recovery: "/v2/recovery",
  sleep: "/v2/activity/sleep",
  cycles: "/v2/cycle",
  workouts: "/v2/activity/workout"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function round(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const factor = 10 ** digits;
  return Math.round(numeric * factor) / factor;
}

function minutesBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return (endDate.getTime() - startDate.getTime()) / 60000;
}

function listDailyFiles(kind) {
  const dir = path.join(whoopDir, kind);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .map((name) => ({
      date: name.slice(0, 10),
      filePath: path.join(dir, name)
    }));
}

function readDaily(kind) {
  return listDailyFiles(kind)
    .map(({ date, filePath }) => {
      const data = readJson(filePath);
      const records = Array.isArray(data) ? data : [data];
      return { date, records: records.filter((record) => record && typeof record === "object") };
    })
    .filter((day) => day.records.length > 0);
}

function primaryTimestamp(kind, record) {
  if (kind === "recovery") return record.created_at || record.updated_at || "";
  return record.start || record.created_at || "";
}

function groupRecordsByDay(kind, records) {
  const byDay = new Map();

  for (const record of records) {
    const day = String(primaryTimestamp(kind, record) || "unknown").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    byDay.set(day, [...(byDay.get(day) || []), record]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRecords]) => ({ date, records: dayRecords }));
}

async function refreshWhoopAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: whoopRefreshToken,
    client_id: whoopClientId,
    client_secret: whoopClientSecret,
    scope: process.env.WHOOP_SCOPE || "offline read:profile read:recovery read:sleep read:cycles read:workout read:body_measurement"
  });

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT
    },
    body
  });

  if (!response.ok) {
    throw new Error(`WHOOP token refresh failed with HTTP ${response.status}`);
  }

  const token = await response.json();
  return {
    accessToken: token.access_token,
    refreshTokenRotated: Boolean(token.refresh_token && token.refresh_token !== whoopRefreshToken)
  };
}

async function whoopApiGet(pathname, token, params) {
  const url = new URL(`${WHOOP_API}${pathname}`);
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`WHOOP ${pathname} failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchWhoopCollection(kind, token, start, end) {
  const records = [];
  let nextToken = null;

  for (let page = 0; page < 80; page += 1) {
    const data = await whoopApiGet(COLLECTIONS[kind], token, {
      start: start.toISOString().replace(/\.\d{3}Z$/, ".000Z"),
      end: end.toISOString().replace(/\.\d{3}Z$/, ".000Z"),
      limit: "25",
      ...(nextToken ? { nextToken } : {})
    });

    records.push(...(Array.isArray(data.records) ? data.records : []));
    nextToken = data.next_token;
    if (!nextToken) break;
  }

  return groupRecordsByDay(kind, records);
}

async function readWhoopDays() {
  if (whoopDir) {
    return {
      recovery: readDaily("recovery"),
      sleep: readDaily("sleep"),
      cycles: readDaily("cycles"),
      workouts: readDaily("workouts"),
      refreshTokenRotated: false,
      mode: "archive"
    };
  }

  const { accessToken, refreshTokenRotated } = await refreshWhoopAccessToken();
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(14, whoopApiDays) * 86400000);
  const entries = await Promise.all(
    Object.keys(COLLECTIONS).map(async (kind) => [kind, await fetchWhoopCollection(kind, accessToken, start, end)])
  );

  return {
    ...Object.fromEntries(entries),
    refreshTokenRotated,
    mode: "api"
  };
}

function latestRecord(records, valueForRecord) {
  return records
    .filter((record) => Number.isFinite(Number(valueForRecord(record))))
    .sort((a, b) => String(a.updated_at || a.created_at || a.start || "").localeCompare(String(b.updated_at || b.created_at || b.start || "")))
    .at(-1);
}

function metricPoint(date, metric, value, unit) {
  const rounded = round(value);
  if (rounded === null) return null;
  return { date, metric, value: rounded, unit, source: "whoop" };
}

function withComparison(points) {
  return points.map((point, index) => {
    const previous = [...points.slice(0, index)]
      .reverse()
      .find((candidate) => Number.isFinite(Number(candidate.value)));
    if (!previous) return point;

    return {
      ...point,
      previousValue: previous.value,
      delta: round(point.value - previous.value)
    };
  });
}

function latest(points) {
  return withComparison(points).at(-1) || null;
}

function averageLast(points, count) {
  const values = points
    .slice(-count)
    .map((point) => Number(point.value))
    .filter(Number.isFinite);
  if (!values.length) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function mergePoints(existingPoints = [], freshPoints = []) {
  const byDate = new Map();
  for (const point of existingPoints) {
    if (point?.date) byDate.set(point.date, point);
  }
  for (const point of freshPoints) {
    if (point?.date) byDate.set(point.date, point);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function updateWhoopSeries(baseData) {
  const whoopDays = await readWhoopDays();
  const recoveryDays = whoopDays.recovery;
  const sleepDays = whoopDays.sleep;
  const cycleDays = whoopDays.cycles;
  const workoutDays = whoopDays.workouts;

  const recoveryScore = recoveryDays
    .map(({ date, records }) => {
      const record = latestRecord(records, (item) => item.score?.recovery_score);
      return record ? metricPoint(date, "recovery_score", record.score.recovery_score, "%") : null;
    })
    .filter(Boolean);

  const hrv = recoveryDays
    .map(({ date, records }) => {
      const record = latestRecord(records, (item) => item.score?.hrv_rmssd_milli);
      return record ? metricPoint(date, "hrv", record.score.hrv_rmssd_milli, "ms") : null;
    })
    .filter(Boolean);

  const restingHeartRate = recoveryDays
    .map(({ date, records }) => {
      const record = latestRecord(records, (item) => item.score?.resting_heart_rate);
      return record ? metricPoint(date, "heart_rate_resting", record.score.resting_heart_rate, "bpm") : null;
    })
    .filter(Boolean);

  const mainSleepByDay = sleepDays
    .map(({ date, records }) => {
      const scored = records.filter((record) => record.score && !record.nap);
      const candidates = scored.length ? scored : records.filter((record) => record.score);
      const record = candidates
        .map((candidate) => {
          const stage = candidate.score?.stage_summary || {};
          const sleepMinutes =
            (Number(stage.total_in_bed_time_milli || 0) -
              Number(stage.total_awake_time_milli || 0) -
              Number(stage.total_no_data_time_milli || 0)) /
            60000;
          return { record: candidate, sleepMinutes };
        })
        .filter(({ sleepMinutes }) => Number.isFinite(sleepMinutes) && sleepMinutes > 0)
        .sort((a, b) => a.sleepMinutes - b.sleepMinutes)
        .at(-1);

      return record ? { date, record: record.record, sleepMinutes: record.sleepMinutes } : null;
    })
    .filter(Boolean);

  const sleepDuration = mainSleepByDay
    .map(({ date, sleepMinutes }) => metricPoint(date, "sleep_duration", sleepMinutes, "minutes"))
    .filter(Boolean);

  const sleepPerformance = mainSleepByDay
    .map(({ date, record }) =>
      metricPoint(date, "sleep_performance", record.score?.sleep_performance_percentage, "%")
    )
    .filter(Boolean);

  const strain = cycleDays
    .map(({ date, records }) => {
      const values = records
        .map((record) => Number(record.score?.strain))
        .filter(Number.isFinite);
      return values.length ? metricPoint(date, "strain", Math.max(...values), "whoop_strain") : null;
    })
    .filter(Boolean);

  const caloriesBurned = cycleDays
    .map(({ date, records }) => {
      const kilojoules = records
        .map((record) => Number(record.score?.kilojoule))
        .filter(Number.isFinite)
        .reduce((sum, value) => sum + value, 0);
      return kilojoules > 0 ? metricPoint(date, "calories_burned", kilojoules / 4.184, "kcal") : null;
    })
    .filter(Boolean);

  const workout = workoutDays
    .map(({ date, records }) => {
      const totalMinutes = records
        .map((record) => minutesBetween(record.start, record.end))
        .filter(Number.isFinite)
        .reduce((sum, value) => sum + value, 0);
      return totalMinutes > 0 ? metricPoint(date, "workout", totalMinutes, "minutes") : null;
    })
    .filter(Boolean);

  const allDates = [...recoveryDays, ...sleepDays, ...cycleDays, ...workoutDays].map((day) => day.date).sort();
  const rows = [recoveryScore, hrv, restingHeartRate, sleepDuration, sleepPerformance, strain, caloriesBurned, workout].reduce(
    (total, points) => total + points.length,
    0
  );
  const existingWhoop = (baseData.sourceCoverage || []).find((source) => source.source === "whoop") || {};
  const freshSeries = {
    recovery_score: recoveryScore,
    sleep_duration: sleepDuration,
    calories_burned: caloriesBurned,
    workout,
    strain
  };
  const series = Object.fromEntries(
    Object.entries(freshSeries).map(([metric, points]) => {
      const merged = whoopDays.mode === "api" ? mergePoints(baseData.series?.[metric] || [], points) : points;
      return [metric, merged.slice(-31)];
    })
  );
  const latestDay = allDates.at(-1) || existingWhoop.latestDay || null;
  const firstDay =
    existingWhoop.firstDay && allDates[0]
      ? [existingWhoop.firstDay, allDates[0]].sort()[0]
      : existingWhoop.firstDay || allDates[0] || null;

  return {
    sourceCoverage: {
      source: "whoop",
      rows: whoopDays.mode === "api" ? Math.max(Number(existingWhoop.rows) || 0, rows) : rows,
      firstDay,
      latestDay,
      metricCount: 21
    },
    latest: {
      recovery_score: latest(recoveryScore) || baseData.latest?.recovery_score || null,
      sleep_performance: latest(sleepPerformance) || baseData.latest?.sleep_performance || null,
      hrv: latest(hrv) || baseData.latest?.hrv || null,
      heart_rate_resting: latest(restingHeartRate) || baseData.latest?.heart_rate_resting || null,
      sleep_duration: latest(sleepDuration) || baseData.latest?.sleep_duration || null,
      strain: latest(strain) || baseData.latest?.strain || null,
      calories_burned: latest(caloriesBurned) || baseData.latest?.calories_burned || null,
      whoopAverages: {
        recovery7d: averageLast(recoveryScore, 7),
        hrv7d: averageLast(hrv, 7),
        rhr7d: averageLast(restingHeartRate, 7),
        sleep7d: averageLast(sleepDuration, 7)
      }
    },
    series,
    refreshTokenRotated: whoopDays.refreshTokenRotated,
    mode: whoopDays.mode
  };
}

async function refreshHealthData(baseData) {
  const whoop = await updateWhoopSeries(baseData);
  const generatedAt = new Date().toISOString();
  const snapshotDate = generatedAt.slice(0, 10);

  const sourceCoverage = (baseData.sourceCoverage || []).filter((source) => source.source !== "whoop");
  sourceCoverage.unshift(whoop.sourceCoverage);

  return {
    ...baseData,
    generatedAt,
    snapshotDate,
    sourceCoverage,
    series: {
      ...(baseData.series || {}),
      ...whoop.series
    },
    latest: {
      ...(baseData.latest || {}),
      ...whoop.latest
    },
    refreshMeta: {
      mode: whoop.mode,
      refreshTokenRotated: whoop.refreshTokenRotated
    }
  };
}

function stableVitalsData(data) {
  const comparable = {
    sourceCoverage: data.sourceCoverage,
    latest: data.latest,
    nutrition: data.nutrition,
    reviewPrompts: data.reviewPrompts,
    series: data.series
  };
  return JSON.stringify(comparable);
}

const existingPublicData = fs.existsSync(publicHealthDataPath) ? readJson(publicHealthDataPath) : null;
const refreshed = await refreshHealthData(readJson(sourceHealthDataPath));
const publicData = {
  generatedAt: refreshed.generatedAt,
  snapshotDate: refreshed.snapshotDate,
  sourceCoverage: refreshed.sourceCoverage,
  latest: refreshed.latest,
  nutrition: refreshed.nutrition,
  reviewPrompts: refreshed.reviewPrompts,
  series: refreshed.series
};
const changed = !existingPublicData || stableVitalsData(existingPublicData) !== stableVitalsData(publicData);

if (!changed) {
  publicData.generatedAt = existingPublicData.generatedAt;
  publicData.snapshotDate = existingPublicData.snapshotDate;
  refreshed.generatedAt = existingPublicData.generatedAt;
  refreshed.snapshotDate = existingPublicData.snapshotDate;
}

if (fs.existsSync(healthDataPath)) {
  writeJson(healthDataPath, refreshed);
}
writeJson(publicHealthDataPath, publicData);

if (process.env.GITHUB_ACTIONS === "true" && refreshed.refreshMeta.refreshTokenRotated) {
  console.warn(
    "::warning::WHOOP returned a rotated refresh token. Update the WHOOP_REFRESH_TOKEN secret or move token persistence to a backend before relying on scheduled refreshes."
  );
}

console.log(
  JSON.stringify(
    {
      snapshotDate: publicData.snapshotDate,
      whoop: publicData.sourceCoverage.find((source) => source.source === "whoop"),
      latest: {
        recovery: publicData.latest.recovery_score?.date,
        sleep: publicData.latest.sleep_duration?.date,
        strain: publicData.latest.strain?.date,
        calories: publicData.latest.calories_burned?.date
      },
      changed,
      mode: refreshed.refreshMeta.mode,
      refreshTokenRotated: refreshed.refreshMeta.refreshTokenRotated
    },
    null,
    2
  )
);
