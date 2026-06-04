import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const healthDataPath = path.join(repoRoot, "data/health-data.json");
const publicHealthDataPath = path.join(repoRoot, "data/public-health-data.json");
const defaultWhoopDir =
  "/Users/danatkinson/Documents/Source Library/evidence/personal/life-archive/Health/Whoop";
const whoopDir = path.resolve(process.env.WHOOP_ARCHIVE_DIR || defaultWhoopDir);

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

function updateWhoopSeries() {
  const recoveryDays = readDaily("recovery");
  const sleepDays = readDaily("sleep");
  const cycleDays = readDaily("cycles");
  const workoutDays = readDaily("workouts");

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

  return {
    sourceCoverage: {
      source: "whoop",
      rows,
      firstDay: allDates[0] || null,
      latestDay: allDates.at(-1) || null,
      metricCount: 21
    },
    latest: {
      recovery_score: latest(recoveryScore),
      sleep_performance: latest(sleepPerformance),
      hrv: latest(hrv),
      heart_rate_resting: latest(restingHeartRate),
      sleep_duration: latest(sleepDuration),
      strain: latest(strain),
      calories_burned: latest(caloriesBurned),
      whoopAverages: {
        recovery7d: averageLast(recoveryScore, 7),
        hrv7d: averageLast(hrv, 7),
        rhr7d: averageLast(restingHeartRate, 7),
        sleep7d: averageLast(sleepDuration, 7)
      }
    },
    series: {
      recovery_score: recoveryScore.slice(-31),
      sleep_duration: sleepDuration.slice(-31),
      calories_burned: caloriesBurned.slice(-31),
      workout: workout.slice(-31),
      strain: strain.slice(-31)
    }
  };
}

function refreshHealthData(baseData) {
  const whoop = updateWhoopSeries();
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
    }
  };
}

const refreshed = refreshHealthData(readJson(healthDataPath));
const publicData = {
  generatedAt: refreshed.generatedAt,
  snapshotDate: refreshed.snapshotDate,
  sourceCoverage: refreshed.sourceCoverage,
  latest: refreshed.latest,
  nutrition: refreshed.nutrition,
  reviewPrompts: refreshed.reviewPrompts,
  series: refreshed.series
};

writeJson(healthDataPath, refreshed);
writeJson(publicHealthDataPath, publicData);

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
      }
    },
    null,
    2
  )
);
