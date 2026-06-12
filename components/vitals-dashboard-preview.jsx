"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Database,
  Droplet,
  HeartPulse,
  Moon,
  TrendingUp,
  Zap
} from "lucide-react";

import fallbackHealthData from "@/data/public-health-data.json";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";

const remoteVitalsDataUrl = (
  process.env.NEXT_PUBLIC_VITALS_DATA_URL || "https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals"
).trim();

// Same artwork as the Personal-page expanded overlay banner, so the
// standalone page and the embed read as one surface.
const bannerArt = "/project-art/personal/albion-sunburst-banner.webp";

const habitStatusLabels = {
  high: "High",
  mid: "Moderate",
  soft: "Light",
  none: "No data"
};

function numberValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value, digits = 0) {
  const numeric = numberValue(value);
  if (numeric === null) return "--";

  return numeric.toLocaleString("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatShortDate(value) {
  if (!value) return "latest";
  const parsed = new Date(String(value).length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return "latest";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(parsed);
}

function dateFromISO(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function rangeDays(range) {
  return Number(String(range).replace("d", "")) || 7;
}

function formatDuration(minutes) {
  const numeric = numberValue(minutes);
  if (numeric === null) return "--";
  const total = Math.round(numeric);

  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

function signed(value, unit = "", digits = 0) {
  const numeric = numberValue(value);
  if (numeric === null) return null;
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";

  return `${sign}${formatNumber(Math.abs(numeric), digits)}${unit}`;
}

function weekdayLetter(dateISO) {
  const parsed = dateFromISO(dateISO);
  return parsed ? ["S", "M", "T", "W", "T", "F", "S"][parsed.getUTCDay()] : "";
}

function scoreLabel(score) {
  const numeric = numberValue(score);
  if (numeric === null) return "Latest";
  if (numeric >= 67) return "Good";
  if (numeric >= 34) return "Watch";
  return "Low";
}

function recoveryLabel(score, delta) {
  const numericDelta = numberValue(delta);
  if (numericDelta !== null && numericDelta > 0) return "Improving";
  if (numericDelta !== null && numericDelta < 0) return "Lower";
  return scoreLabel(score);
}

function sleepLabel(minutes) {
  const numeric = numberValue(minutes);
  if (numeric === null) return "Latest";
  if (numeric >= 420) return "Good";
  if (numeric >= 360) return "Watch";
  return "Short";
}

function strainLabel(strain) {
  const numeric = numberValue(strain);
  if (numeric === null) return "Latest";
  if (numeric >= 14) return "High";
  if (numeric >= 8) return "Moderate";
  if (numeric >= 4) return "Light";
  return "Rest day";
}

function scoreFromStrain(strain) {
  const numeric = numberValue(strain);
  if (numeric === null) return null;
  return Math.max(0, Math.min(100, Math.round((numeric / 21) * 100)));
}

function cleanSeries(points) {
  return (points || []).filter((point) => point?.date && numberValue(point.value) !== null);
}

function windowSeries(points, startISO, endISO) {
  return cleanSeries(points).filter((point) => point.date >= startISO && point.date <= endISO);
}

// Delta for the last windowed point, measured against the reading that
// precedes it in the full series (which may fall outside the window).
function lastWithDelta(fullSeries, windowed) {
  const last = windowed.at(-1) || null;
  if (!last) return null;

  const all = cleanSeries(fullSeries);
  const index = all.findIndex((point) => point.date === last.date);
  const previous = index > 0 ? all[index - 1] : null;

  return {
    ...last,
    value: numberValue(last.value),
    delta: previous ? numberValue(last.value) - numberValue(previous.value) : null
  };
}

function averageOf(points) {
  if (!points.length) return null;
  return points.reduce((sum, point) => sum + numberValue(point.value), 0) / points.length;
}

function sumOf(points) {
  return points.reduce((sum, point) => sum + numberValue(point.value), 0);
}

function bestOf(points) {
  return points.length
    ? [...points].sort((a, b) => numberValue(a.value) - numberValue(b.value)).at(-1)
    : null;
}

function axisFor(points) {
  if (points.length < 2) return [];
  const middle = points[Math.floor((points.length - 1) / 2)];

  return points.length > 4
    ? [formatShortDate(points[0].date), formatShortDate(middle.date), formatShortDate(points.at(-1).date)]
    : [formatShortDate(points[0].date), formatShortDate(points.at(-1).date)];
}

function sparkPoints(points, width = 220, height = 70, pad = 10) {
  const sample = cleanSeries(points)
    .map((point) => numberValue(point.value))
    .slice(-14);

  if (sample.length < 2) return null;

  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = max - min || 1;

  return sample
    .map((value, index) => {
      const x = pad + (index / (sample.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);

      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");
}

function chartPath(points, width = 520, height = 150, pad = 22) {
  const sample = points.map((point) => numberValue(point.value));
  if (sample.length < 2) return null;

  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = max - min || 1;

  return sample
    .map((value, index) => {
      const x = pad + (index / (sample.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);

      return `${index === 0 ? "M" : "L"}${Math.round(x)} ${Math.round(y)}`;
    })
    .join("");
}

function chartEndY(points, height = 150, pad = 22) {
  const sample = points.map((point) => numberValue(point.value));
  if (sample.length < 2) return null;

  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = max - min || 1;
  return height - pad - ((sample.at(-1) - min) / range) * (height - pad * 2);
}

function generatedParts(data, fallbackDate) {
  const day = String(data.generatedAt || fallbackDate || "").slice(0, 10);
  const parsed = dateFromISO(day);

  return {
    generatedDay: parsed ? formatShortDate(day) : "latest",
    generatedYear: parsed ? parsed.getUTCFullYear() : new Date().getUTCFullYear()
  };
}

// Trend across the full series: average of the latest 7 readings against
// the 7 before them. Null when there isn't enough history.
function seriesTrend(points) {
  const all = cleanSeries(points);
  if (all.length < 8) return null;

  const recent = averageOf(all.slice(-7));
  const prior = averageOf(all.slice(-14, -7));
  if (recent === null || prior === null) return null;

  const delta = recent - prior;
  const threshold = Math.abs(prior) * 0.03;
  const state = Math.abs(delta) <= threshold ? "Stable" : delta > 0 ? "Trending up" : "Trending down";

  return { delta, state, spark: sparkPoints(all) };
}

function habitTone(metric, value) {
  const numeric = numberValue(value);
  if (numeric === null) return "none";

  if (metric === "recovery") return numeric >= 67 ? "high" : numeric >= 34 ? "mid" : "soft";
  if (metric === "sleep") return numeric >= 420 ? "high" : numeric >= 360 ? "mid" : "soft";
  if (metric === "strain") return numeric >= 14 ? "high" : numeric >= 8 ? "mid" : "soft";
  if (metric === "calories") return numeric >= 2500 ? "high" : numeric >= 1800 ? "mid" : "soft";
  if (metric === "workout") return numeric >= 60 ? "high" : numeric >= 20 ? "mid" : "soft";
  return "none";
}

function habitValueText(metric, value) {
  if (numberValue(value) === null) return "no data";
  if (metric === "sleep") return formatDuration(value);
  if (metric === "strain") return `${formatNumber(value, 1)} strain`;
  if (metric === "calories") return `${formatNumber(value)} kcal`;
  if (metric === "workout") return `${formatDuration(value)} active`;
  return `${formatNumber(value)}%`;
}

export function getVitalsSnapshotDate(data) {
  return (
    data?.snapshotDate ||
    data?.latest?.recovery_score?.date ||
    String(data?.generatedAt || "").slice(0, 10) ||
    null
  );
}

export function vitalsSnapshotLabel(snapshotDate, range, snapshotIndex) {
  const end = dateFromISO(snapshotDate);
  if (!end) return formatShortDate(snapshotDate);

  return formatShortDate(isoDate(addDays(end, -snapshotIndex * rangeDays(range))));
}

function buildModel(data, range, snapshotIndex) {
  const latest = data.latest || {};
  const series = data.series || {};
  const sourceCoverage = Array.isArray(data.sourceCoverage) ? data.sourceCoverage : [];
  const days = rangeDays(range);
  const snapshotDate = getVitalsSnapshotDate(data) || isoDate(new Date());
  const endDate = addDays(dateFromISO(snapshotDate) || new Date(), -snapshotIndex * days);
  const endISO = isoDate(endDate);
  const startISO = isoDate(addDays(endDate, -(days - 1)));
  const { generatedDay, generatedYear } = generatedParts(data, snapshotDate);

  const recovery = windowSeries(series.recovery_score, startISO, endISO);
  const sleep = windowSeries(series.sleep_duration, startISO, endISO);
  const strain = windowSeries(series.strain, startISO, endISO);
  const calories = windowSeries(series.calories_burned, startISO, endISO);
  const workout = windowSeries(series.workout, startISO, endISO);

  const recoveryLast = lastWithDelta(series.recovery_score, recovery);
  const sleepLast = lastWithDelta(series.sleep_duration, sleep);
  const strainLast = lastWithDelta(series.strain, strain);

  const hrv = latest.hrv || null;
  const restingHeartRate = latest.heart_rate_resting || null;
  const sleepPerformance = latest.sleep_performance || null;
  const averages = latest.whoopAverages || {};
  const weight = latest.weight || null;
  const weightSeries = cleanSeries(series.weight);
  const stepsSeries = cleanSeries(series.steps);
  const stepsLast = stepsSeries.at(-1) || null;
  const nutrition = data.nutrition?.latest || null;

  // 14 daily cells per metric, ending at the window end — real readings only.
  const habitDates = Array.from({ length: 14 }, (_, index) => isoDate(addDays(endDate, index - 13)));
  const habitRows = [
    ["Recovery", "recovery", series.recovery_score],
    ["Sleep", "sleep", series.sleep_duration],
    ["Strain", "strain", series.strain],
    ["Calories", "calories", series.calories_burned],
    ["Workouts", "workout", series.workout]
  ].map(([label, metric, metricSeries]) => {
    const byDate = new Map(cleanSeries(metricSeries).map((point) => [point.date, point.value]));
    return { label, metric, values: habitDates.map((date) => byDate.get(date) ?? null) };
  });

  const trendRows = [
    ["Recovery", seriesTrend(series.recovery_score), "%", 0],
    ["Sleep", seriesTrend(series.sleep_duration), "m", 0],
    ["Strain", seriesTrend(series.strain), "", 1],
    ["Calories", seriesTrend(series.calories_burned), " kcal", 0]
  ].filter(([, trend]) => trend !== null);

  const bestRecovery = bestOf(recovery);
  const readiness = recoveryLast ? Math.round(recoveryLast.value) : null;

  return {
    startISO,
    endISO,
    windowLabel: `${formatShortDate(startISO)} – ${formatShortDate(endISO)}`,
    generatedDay,
    generatedYear,
    sourceCount: sourceCoverage.length,
    sources: sourceCoverage,
    headlineReadiness: numberValue(latest.recovery_score?.value),

    readiness,
    readinessLabel: scoreLabel(readiness),
    recovery,
    recoveryLast,
    recoveryStatus: recoveryLast ? recoveryLabel(recoveryLast.value, recoveryLast.delta) : "",
    recoveryDelta: recoveryLast ? signed(recoveryLast.delta, "%") : null,
    recoveryAvg: averageOf(recovery),
    recoveryPath: chartPath(recovery),
    recoveryEndY: chartEndY(recovery),
    recoveryAxis: axisFor(recovery),

    hrv,
    restingHeartRate,
    sleepPerformance,
    hrvAvg7d: numberValue(averages.hrv7d),
    rhrAvg7d: numberValue(averages.rhr7d),

    sleep,
    sleepLast,
    sleepAvg: averageOf(sleep),
    bestSleep: bestOf(sleep),

    strain,
    strainLast,
    strainScore: scoreFromStrain(strainLast?.value),
    weeklyLoad: strain.length ? Math.round(sumOf(strain)) : null,
    activityMinutes: workout.length ? Math.round(sumOf(workout)) : null,
    workoutDays: workout.length,

    weight,
    weightSpark: sparkPoints(weightSeries),
    weightAxis: axisFor(weightSeries.slice(-14)),
    stepsLast,
    stepsWeekAvg: averageOf(stepsSeries.slice(-7)),
    stepsSpark: sparkPoints(stepsSeries),

    nutrition,
    habitDates,
    habitRows,
    trendRows,
    bestRecoveryDay: bestRecovery ? formatShortDate(bestRecovery.date) : null,
    bestRecoveryScore: bestRecovery ? Math.round(bestRecovery.value) : null,
    readinessFocus: recoveryLast?.delta !== null && recoveryLast?.delta < 0 ? "Recovery dip" : "Keep trend"
  };
}

function Ring({ value, label, tone = "green", size = 118 }) {
  const numeric = numberValue(value);
  if (numeric === null) return null;
  const safe = Math.max(0, Math.min(100, numeric));

  return (
    <div
      className={`vitals-ai-ring vitals-hover-tip ${tone}`}
      style={{
        "--ring-size": `${size}px`,
        "--ring-progress": `${safe * 3.6}deg`,
        "--ring-progress-mid": `${safe * 1.8}deg`,
        "--ring-start": `${safe * -1.8}deg`
      }}
      tabIndex={0}
      role="img"
      aria-label={`${label || "Score"} ${Math.round(safe)}%`}
      data-tooltip={`${label || "Score"}: ${Math.round(safe)}%`}
      title={`${label || "Score"}: ${Math.round(safe)}%`}
    >
      <span className="vitals-ai-ring-orbit" aria-hidden="true" />
      <span className="vitals-ai-ring-copy">
        <strong>{Math.round(safe)}%</strong>
        {label ? <span className="vitals-ai-ring-label">{label}</span> : null}
      </span>
    </div>
  );
}

function TinyLine({ points, tone = "green" }) {
  if (!points) return null;

  return (
    <svg className={`vitals-ai-spark ${tone}`} viewBox="0 0 220 70" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function CardHeading({ icon: Icon, title, note }) {
  return (
    <header className="vitals-ai-card-heading">
      <div>
        {Icon ? <Icon size={15} strokeWidth={1.7} /> : null}
        <h2>{title}</h2>
      </div>
      {note ? <span className="vitals-heading-note">{note}</span> : null}
    </header>
  );
}

function EmptyNote({ model }) {
  return <p className="vitals-card-note">No readings between {model.windowLabel}.</p>;
}

function ScoreBreakdown({ model }) {
  const rows = [
    ["Sleep quality", model.sleepPerformance ? Math.round(model.sleepPerformance.value) : null, "green"],
    ["Recovery", model.readiness, "green"],
    ["Strain", model.strainScore, "orange"]
  ].filter(([, value]) => value !== null);

  return (
    <div className="vitals-score-breakdown">
      <strong>Score Breakdown</strong>
      {rows.map(([label, value, tone]) => (
        <div
          className="vitals-score-row vitals-hover-tip"
          data-tooltip={`${label}: ${value}%`}
          title={`${label}: ${value}%`}
          key={label}
        >
          <span>{label}</span>
          <i>
            <b className={tone} style={{ width: `${value}%` }} />
          </i>
          <em>{value}%</em>
        </div>
      ))}
    </div>
  );
}

function HealthScoreCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-card-wash vitals-score-card" data-card-metric="readiness" tabIndex={0}>
      <CardHeading icon={HeartPulse} title="Health Score" />
      {model.readiness !== null ? (
        <div className="vitals-score-main">
          <div className="vitals-score-hero">
            <Ring value={model.readiness} tone="green" size={132} />
            <small>{model.readinessLabel}</small>
            {model.recoveryDelta ? <p>{model.recoveryDelta} vs previous</p> : null}
          </div>
          <ScoreBreakdown model={model} />
        </div>
      ) : (
        <EmptyNote model={model} />
      )}
      <footer>
        Updated {model.generatedDay} {model.generatedYear} · {model.sourceCount} sources
      </footer>
    </article>
  );
}

function RecoveryCard({ model }) {
  const last = model.recoveryLast;

  return (
    <article className="vitals-ai-card vitals-recovery-card" data-card-metric="recovery" tabIndex={0}>
      <CardHeading icon={Droplet} title="Recovery" note={last ? `whoop · ${formatShortDate(last.date)}` : null} />
      {last ? (
        <>
          <div className="vitals-recovery-layout">
            <div>
              <strong>{formatNumber(last.value)}</strong>
              <span>%</span>
              <small>{model.recoveryStatus}</small>
              {model.recoveryDelta ? <p>{model.recoveryDelta} vs previous</p> : null}
            </div>
            <dl>
              {model.hrv ? (
                <div
                  className="vitals-hover-tip"
                  data-tooltip={`HRV ${formatNumber(model.hrv.value, 1)} ms on ${formatShortDate(model.hrv.date)}${model.hrvAvg7d !== null ? `, 7-day ${formatNumber(model.hrvAvg7d, 1)} ms` : ""}`}
                  title={`HRV ${formatNumber(model.hrv.value, 1)} ms on ${formatShortDate(model.hrv.date)}`}
                >
                  <dt>HRV</dt>
                  <dd>{formatNumber(model.hrv.value, 1)} ms</dd>
                  <em>{signed(model.hrv.delta, " ms", 1) || formatShortDate(model.hrv.date)}</em>
                </div>
              ) : null}
              {model.restingHeartRate ? (
                <div
                  className="vitals-hover-tip"
                  data-tooltip={`Resting HR ${formatNumber(model.restingHeartRate.value)} bpm on ${formatShortDate(model.restingHeartRate.date)}${model.rhrAvg7d !== null ? `, 7-day ${formatNumber(model.rhrAvg7d)} bpm` : ""}`}
                  title={`Resting HR ${formatNumber(model.restingHeartRate.value)} bpm on ${formatShortDate(model.restingHeartRate.date)}`}
                >
                  <dt>Resting HR</dt>
                  <dd>{formatNumber(model.restingHeartRate.value)} bpm</dd>
                  <em>{signed(model.restingHeartRate.delta, " bpm") || formatShortDate(model.restingHeartRate.date)}</em>
                </div>
              ) : null}
              {model.recoveryAvg !== null ? (
                <div
                  className="vitals-hover-tip"
                  data-tooltip={`Average across ${model.recovery.length} readings in this window`}
                  title={`Average across ${model.recovery.length} readings in this window`}
                >
                  <dt>Window avg</dt>
                  <dd>{formatNumber(model.recoveryAvg)}%</dd>
                  <em>{model.recovery.length} readings</em>
                </div>
              ) : null}
            </dl>
          </div>
          {model.recoveryPath ? (
            <>
              <svg className="vitals-ai-line-chart" viewBox="0 0 540 160" preserveAspectRatio="none" aria-hidden="true">
                <title>Recovery trend ending at {formatNumber(last.value)}%</title>
                <line x1="28" x2="512" y1="126" y2="126" />
                <path d={model.recoveryPath} pathLength="1" />
                <circle cx="512" cy={model.recoveryEndY ?? 70} r="5" />
              </svg>
              <div className="vitals-ai-axis">
                {model.recoveryAxis.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <EmptyNote model={model} />
      )}
    </article>
  );
}

function SleepCard({ model }) {
  const last = model.sleepLast;
  const totalMinutes = model.sleep.length ? sumOf(model.sleep) : 0;

  return (
    <article className="vitals-ai-card vitals-sleep-card" data-card-metric="sleep" tabIndex={0}>
      <CardHeading icon={Moon} title="Sleep" note={last ? `whoop · ${formatShortDate(last.date)}` : null} />
      {last ? (
        <>
          <div className="vitals-sleep-top">
            <div>
              <strong>{formatDuration(last.value)}</strong>
              <small>{sleepLabel(last.value)}</small>
              {last.delta !== null ? <p>{signed(last.delta, "m")} vs previous</p> : null}
            </div>
            {model.sleepPerformance ? (
              <Ring value={model.sleepPerformance.value} label="Quality" tone="blue" size={112} />
            ) : null}
          </div>
          <div className="vitals-sleep-stages">
            <header>
              <span>
                Nights in this window · each segment is one night&apos;s share of {formatDuration(totalMinutes)} total
              </span>
            </header>
            <div className="vitals-sleep-bar">
              {model.sleep.map((night) => {
                const share = totalMinutes ? (numberValue(night.value) / totalMinutes) * 100 : 0;
                const tooltip = `${formatShortDate(night.date)}: ${formatDuration(night.value)}`;

                return (
                  <b
                    className="vitals-hover-tip night"
                    data-tooltip={tooltip}
                    title={tooltip}
                    style={{ width: `${share}%` }}
                    key={night.date}
                  />
                );
              })}
            </div>
            <footer>
              <span>{formatShortDate(model.sleep[0].date)}</span>
              <span>{formatShortDate(model.sleep.at(-1).date)}</span>
            </footer>
          </div>
          <div className="vitals-sleep-foot">
            <span>
              Window average <b>{formatDuration(model.sleepAvg)}</b>
            </span>
            {model.bestSleep ? (
              <span>
                Best night <b>{formatDuration(model.bestSleep.value)}</b> <em>{formatShortDate(model.bestSleep.date)}</em>
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <EmptyNote model={model} />
      )}
    </article>
  );
}

function TrainingLoadCard({ model }) {
  const last = model.strainLast;

  return (
    <article className="vitals-ai-card vitals-training-card" data-card-metric="training" tabIndex={0}>
      <CardHeading icon={Zap} title="Training Load" note={last ? `whoop · ${formatShortDate(last.date)}` : null} />
      {last ? (
        <>
          <div className="vitals-training-main">
            <div>
              <strong>{formatNumber(last.value, 1)}</strong>
              <small>{strainLabel(last.value)}</small>
              {last.delta !== null ? <p>{signed(last.delta, "", 1)} vs previous</p> : null}
            </div>
            <div className="vitals-load-chart">
              <span>Daily strain · {model.windowLabel}</span>
              <div>
                {model.strain.map((point, index) => {
                  const height = Math.max((numberValue(point.value) / 21) * 100, 3);
                  const tooltip = `${formatShortDate(point.date)}: ${formatNumber(point.value, 1)} strain`;

                  return (
                    <i
                      className="vitals-hover-tip"
                      data-tooltip={tooltip}
                      title={tooltip}
                      style={{ height: `${height}%`, "--bar-delay": `${index * 28}ms` }}
                      key={point.date}
                    />
                  );
                })}
              </div>
              <footer>
                {model.strain.map((point) => (
                  <em key={point.date}>{weekdayLetter(point.date)}</em>
                ))}
              </footer>
            </div>
          </div>
          <div className="vitals-training-stats">
            <div>
              <span>Window Load</span>
              <strong>{model.weeklyLoad ?? "--"}</strong>
              <small>{model.strain.length} days</small>
            </div>
            <div>
              <span>Activity Minutes</span>
              <strong>{model.activityMinutes ?? "--"}</strong>
              <small>{model.workoutDays} workout {model.workoutDays === 1 ? "day" : "days"}</small>
            </div>
            <div>
              <span>Day Intensity</span>
              <strong>{formatNumber(numberValue(last.value) / 21, 2)}</strong>
              <small>of 21 max</small>
            </div>
            <Ring value={model.strainScore} tone="green" size={72} />
          </div>
        </>
      ) : (
        <EmptyNote model={model} />
      )}
    </article>
  );
}

function BodyMetricsCard({ model }) {
  const rows = [];
  if (model.weight) {
    rows.push([
      "Weight",
      `${formatNumber(model.weight.value, 1)} kg`,
      signed(model.weight.delta, " kg", 1) || "latest",
      `measured ${formatShortDate(model.weight.date)}`
    ]);
  }
  if (model.stepsLast) {
    rows.push([
      "Steps",
      formatNumber(model.stepsLast.value),
      formatShortDate(model.stepsLast.date),
      `last counted ${formatShortDate(model.stepsLast.date)}`
    ]);
    if (model.stepsWeekAvg !== null) {
      rows.push([
        "Steps, final week",
        formatNumber(model.stepsWeekAvg),
        "daily avg",
        "average of the last 7 recorded days"
      ]);
    }
  }

  if (!rows.length) return null;

  return (
    <article className="vitals-ai-card vitals-body-metrics-card" data-card-metric="body" tabIndex={0}>
      <CardHeading icon={Activity} title="Body Metrics" note="dormant sources" />
      <div className="vitals-body-metrics-layout">
        <dl>
          {rows.map(([label, value, delta, tooltip]) => (
            <div className="vitals-hover-tip" data-tooltip={tooltip} title={tooltip} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              <em>{delta}</em>
            </div>
          ))}
        </dl>
        <TinyLine points={model.weightSpark || model.stepsSpark} tone="green" />
      </div>
      <div className="vitals-ai-axis">
        {model.weightAxis.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </article>
  );
}

function NutritionCard({ model }) {
  const nutrition = model.nutrition;
  if (!nutrition) return null;

  const kcal = numberValue(nutrition.kcal_7d);
  const protein = numberValue(nutrition.protein_7d);
  const fat = numberValue(nutrition.fat_7d);
  const netCarbs = numberValue(nutrition.netcarb_7d);
  const macroKcal = [protein ? protein * 4 : 0, fat ? fat * 9 : 0, netCarbs ? netCarbs * 4 : 0];
  const macroTotal = macroKcal.reduce((sum, value) => sum + value, 0) || 1;
  const proteinShare = protein && kcal ? Math.round(((protein * 4) / kcal) * 100) : null;
  const rows = [
    ["Calories", kcal !== null ? `${formatNumber(kcal)} kcal / day` : null, 100, "green"],
    ["Protein", protein !== null ? `${formatNumber(protein)} g / day` : null, (macroKcal[0] / macroTotal) * 100, "green"],
    ["Fat", fat !== null ? `${formatNumber(fat)} g / day` : null, (macroKcal[1] / macroTotal) * 100, "orange"],
    ["Net carbs", netCarbs !== null ? `${formatNumber(netCarbs)} g / day` : null, (macroKcal[2] / macroTotal) * 100, "blue"]
  ].filter(([, value]) => value !== null);

  return (
    <article className="vitals-ai-card vitals-nutrition-card-v2" data-card-metric="nutrition" tabIndex={0}>
      <CardHeading icon={Droplet} title="Nutrition" note={`7-day averages to ${formatShortDate(nutrition.date)}`} />
      <div className="vitals-nutrition-v2-body">
        <Ring value={proteinShare} label="Protein" tone="green" size={96} />
        <div>
          {rows.map(([label, value, width, tone]) => (
            <section
              className="vitals-hover-tip"
              data-tooltip={`${label}: ${value}`}
              title={`${label}: ${value}`}
              key={label}
            >
              <span>{label}</span>
              <strong>{value}</strong>
              <i>
                <b className={tone} style={{ width: `${Math.max(Math.round(width), 4)}%` }} />
              </i>
            </section>
          ))}
        </div>
      </div>
      <footer>
        Macro bars show each macro&apos;s share of logged energy · source dormant since {formatShortDate(nutrition.date)}
      </footer>
    </article>
  );
}

function TrendsCard({ model }) {
  if (!model.trendRows.length) return null;

  return (
    <article className="vitals-ai-card vitals-trends-card" data-card-metric="trends" tabIndex={0}>
      <CardHeading icon={TrendingUp} title="Trends" note="last 7 readings vs the 7 before" />
      <div className="vitals-trends-list">
        {model.trendRows.map(([label, trend, unit, digits]) => {
          const tone = trend.state === "Trending up" ? "up" : trend.state === "Trending down" ? "down" : "flat";
          const deltaText = signed(trend.delta, unit, digits);
          const tooltip = `${label}: ${trend.state}, ${deltaText} vs prior week`;

          return (
            <div className="vitals-hover-tip" data-tooltip={tooltip} title={tooltip} key={label}>
              <span>{label}</span>
              <strong className={tone}>{trend.state}</strong>
              <em>{deltaText}</em>
              <TinyLine points={trend.spark} tone="green" />
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SourcesCard({ model }) {
  if (!model.sources.length) return null;

  return (
    <article className="vitals-ai-card vitals-sources-card" data-card-metric="sources" tabIndex={0}>
      <CardHeading icon={Database} title="Sources" note={`compiled ${model.generatedDay}`} />
      <ul className="vitals-sources-list">
        {model.sources.map((source) => {
          const live = source.latestDay >= model.startISO;
          const tooltip = `${source.source}: ${formatNumber(source.rows)} rows, ${source.metricCount} metrics, ${formatShortDate(source.firstDay)} – ${formatShortDate(source.latestDay)}`;

          return (
            <li className="vitals-hover-tip" data-tooltip={tooltip} title={tooltip} key={source.source}>
              <i className={live ? "high" : "none"} aria-hidden="true" />
              <strong>{source.source}</strong>
              <span>to {formatShortDate(source.latestDay)}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function ReadinessHabitsCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-card-wash vitals-habits-card" data-card-metric="habits" tabIndex={0}>
      <div className="vitals-habits-board">
        <header>
          <div>
            <h2>Daily Signals</h2>
            <p>Two weeks of real readings to {formatShortDate(model.endISO)}</p>
          </div>
          <p className="vitals-habits-meta">
            {model.bestRecoveryDay ? (
              <span>
                Best recovery <b>{model.bestRecoveryScore}% · {model.bestRecoveryDay}</b>
              </span>
            ) : null}
            <span>
              Focus <b>{model.readinessFocus}</b>
            </span>
          </p>
        </header>
        <div className="vitals-habit-days">
          {model.habitDates.map((date) => (
            <span key={date}>{weekdayLetter(date)}</span>
          ))}
        </div>
        {model.habitRows.map((row) => (
          <div className="vitals-habit-row" key={row.label}>
            <span>{row.label}</span>
            {row.values.map((value, index) => {
              const tone = habitTone(row.metric, value);
              const tooltip = `${row.label} ${formatShortDate(model.habitDates[index])}: ${habitValueText(row.metric, value)}`;

              return (
                <i
                  className={`vitals-hover-tip ${tone}`}
                  data-tooltip={tooltip}
                  title={tooltip}
                  style={{ "--cell-delay": `${index * 8}ms` }}
                  key={model.habitDates[index]}
                />
              );
            })}
          </div>
        ))}
        <footer>
          <span>
            <i className="high" /> {habitStatusLabels.high}
          </span>
          <span>
            <i className="mid" /> {habitStatusLabels.mid}
          </span>
          <span>
            <i className="soft" /> {habitStatusLabels.soft}
          </span>
          <span>
            <i className="none" /> {habitStatusLabels.none}
          </span>
        </footer>
      </div>
    </article>
  );
}

export function VitalsDashboardPreview({
  compact = false,
  dataUrl = remoteVitalsDataUrl,
  range: rangeProp,
  snapshotIndex: snapshotIndexProp,
  onRangeChange,
  onSnapshotIndexChange
}) {
  const [runtimeHealthData, setRuntimeHealthData] = useState(fallbackHealthData);
  const [internalRange, setInternalRange] = useState("7d");
  const [internalSnapshotIndex, setInternalSnapshotIndex] = useState(0);
  const range = rangeProp ?? internalRange;
  const snapshotIndex = snapshotIndexProp ?? internalSnapshotIndex;

  useEffect(() => {
    const url = String(dataUrl || "").trim();
    if (!url) return undefined;

    let cancelled = false;

    const applyHealthData = (data) => {
      if (!cancelled && data?.sourceCoverage && data?.latest && data?.series) {
        setRuntimeHealthData(data);
      }
    };

    applyHealthData(readSessionJson(url));
    fetchSessionJson(url).then(applyHealthData).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  const model = useMemo(
    () => buildModel(runtimeHealthData, range, snapshotIndex),
    [runtimeHealthData, range, snapshotIndex]
  );

  function setRange(option) {
    if (rangeProp !== undefined && onRangeChange) {
      onRangeChange(option);
    } else {
      setInternalRange(option);
      setInternalSnapshotIndex(0);
    }
  }

  function moveSnapshot(direction) {
    const next = (current) => Math.max(0, Math.min(3, current - direction));

    if (snapshotIndexProp !== undefined && onSnapshotIndexChange) {
      onSnapshotIndexChange(next(snapshotIndex));
    } else {
      setInternalSnapshotIndex(next);
    }
  }

  return (
    <section className={`vitals-ai-dashboard ${compact ? "is-compact" : ""}`} aria-label="Vitals dashboard">
      <div className="vitals-ai-shell">
        {rangeProp === undefined ? (
          <header className="vitals-ai-toolbar">
            <img className="vitals-banner-art" src={bannerArt} alt="" aria-hidden="true" draggable="false" />
            <p className="vitals-hero-eyebrow">
              Vitals <em>Health Intelligence</em>
            </p>
            <div className="vitals-ai-controls">
              {model.headlineReadiness !== null ? (
                <p className="vitals-banner-stat">
                  <strong>{formatNumber(model.headlineReadiness)}%</strong>
                  <small>overall readiness</small>
                </p>
              ) : null}
              <div className="vitals-ai-date">
                <button type="button" onClick={() => moveSnapshot(-1)} aria-label="Previous dashboard snapshot">
                  <ChevronLeft size={17} />
                </button>
                <span>{model.windowLabel}</span>
                <button type="button" onClick={() => moveSnapshot(1)} aria-label="Next dashboard snapshot">
                  <ChevronRight size={17} />
                </button>
              </div>
              <div className="vitals-ai-ranges" aria-label="Dashboard range">
                {["7d", "14d", "30d"].map((option) => (
                  <button type="button" className={range === option ? "active" : ""} onClick={() => setRange(option)} key={option}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </header>
        ) : null}

        <section className="vitals-ai-grid" key={model.windowLabel}>
          <HealthScoreCard model={model} />
          <RecoveryCard model={model} />
          <SleepCard model={model} />
          <TrainingLoadCard model={model} />
          <BodyMetricsCard model={model} />
          <NutritionCard model={model} />
          <TrendsCard model={model} />
          <SourcesCard model={model} />
          <ReadinessHabitsCard model={model} />
        </section>
      </div>
    </section>
  );
}
