"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Droplet,
  HeartPulse,
  Info,
  Moon,
  Zap
} from "lucide-react";

import fallbackHealthData from "@/data/public-health-data.json";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";

const remoteVitalsDataUrl = (
  process.env.NEXT_PUBLIC_VITALS_DATA_URL || "https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals"
).trim();

const bannerImage = "/project-art/personal/albion-sunburst-hero.webp";

const habitDays = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];

const habitStatusLabels = {
  high: "Optimal",
  mid: "Good",
  watch: "Needs attention",
  soft: "No data",
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
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "latest";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short"
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
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function signed(value, unit = "", digits = 0) {
  const numeric = numberValue(value);
  if (numeric === null) return "0";
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";

  return `${sign}${formatNumber(Math.abs(numeric), digits)}${unit}`;
}

function metricNumber(metric, fallback = null) {
  const numeric = numberValue(metric?.value);
  return numeric === null ? fallback : numeric;
}

function metricDelta(metric, fallback = null) {
  const numeric = numberValue(metric?.delta);
  return numeric === null ? fallback : numeric;
}

function metricSigned(metric, unit = "", digits = 0, fallback = "0") {
  const delta = metricDelta(metric);
  return delta === null ? fallback : signed(delta, unit, digits);
}

function generatedParts(data, fallbackDate) {
  const day = String(data.generatedAt || fallbackDate || "").slice(0, 10);
  const parsed = dateFromISO(day);

  return {
    generatedDay: parsed ? formatShortDate(day) : "latest",
    generatedYear: parsed ? parsed.getUTCFullYear() : new Date().getUTCFullYear()
  };
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
  if (numeric === null) return 72;
  return Math.max(0, Math.min(100, Math.round((numeric / 21) * 100)));
}

function sumRecent(points, count) {
  return (points || [])
    .slice(-count)
    .map((point) => numberValue(point.value))
    .filter((value) => value !== null)
    .reduce((sum, value) => sum + value, 0);
}

function axisLabels(points, fallback = ["30 May", "2 Jun", "5 Jun"]) {
  const sample = (points || [])
    .filter((point) => point?.date)
    .slice(-8);

  if (sample.length < 2) return fallback;

  const middle = sample[Math.floor((sample.length - 1) / 2)];
  return [sample[0], middle, sample.at(-1)].map((point) => formatShortDate(point.date));
}

function bestRecent(points, count = 7) {
  return (points || [])
    .slice(-count)
    .filter((point) => numberValue(point.value) !== null)
    .sort((a, b) => Number(a.value) - Number(b.value))
    .at(-1) || null;
}

function sparkPoints(points, fallback, width = 220, height = 70, pad = 10) {
  const sample = (points || [])
    .map((point) => numberValue(point.value))
    .filter((value) => value !== null)
    .slice(-8);

  if (sample.length < 2) return fallback;

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

function chartPath(points, fallback, width = 520, height = 150, pad = 22) {
  const sample = (points || [])
    .map((point) => ({ ...point, value: numberValue(point.value) }))
    .filter((point) => point.value !== null)
    .slice(-8);

  if (sample.length < 2) return fallback;

  const min = Math.min(...sample.map((point) => point.value));
  const max = Math.max(...sample.map((point) => point.value));
  const range = max - min || 1;

  return sample
    .map((point, index) => {
      const x = pad + (index / (sample.length - 1)) * (width - pad * 2);
      const y = height - pad - ((point.value - min) / range) * (height - pad * 2);

      return `${index === 0 ? "M" : "L"}${Math.round(x)} ${Math.round(y)}`;
    })
    .join("");
}

function buildModel(data) {
  const latest = data.latest || {};
  const series = data.series || {};
  const sourceCoverage = Array.isArray(data.sourceCoverage) ? data.sourceCoverage : [];
  const recovery = latest.recovery_score || {};
  const hrv = latest.hrv || {};
  const restingHeartRate = latest.heart_rate_resting || {};
  const sleepDuration = latest.sleep_duration || {};
  const sleepPerformance = latest.sleep_performance || {};
  const strain = latest.strain || {};
  const caloriesBurned = latest.calories_burned || {};
  const weight = latest.weight || {};
  const nutrition = data.nutrition?.latest || {};
  const sourceCount = sourceCoverage.length || 5;
  const snapshotDate =
    data.snapshotDate ||
    recovery.date ||
    sleepDuration.date ||
    strain.date ||
    String(data.generatedAt || "").slice(0, 10) ||
    "2026-06-05";
  const { generatedDay, generatedYear } = generatedParts(data, snapshotDate);
  const readinessScore = Math.round(metricNumber(recovery, 68));
  const recoveryScore = readinessScore;
  const sleepMinutes = metricNumber(sleepDuration, null);
  const sleepPerformanceScore = Math.round(metricNumber(sleepPerformance, 84));
  const strainValue = metricNumber(strain, 2.2);
  const strainScore = scoreFromStrain(strainValue);
  const weeklyLoad = Math.round(sumRecent(series.strain, 7));
  const activityMinutes = Math.round(sumRecent(series.workout, 7));
  const caloriesValue = metricNumber(caloriesBurned, numberValue(nutrition.kcal_7d) || 1842);
  const proteinValue = numberValue(nutrition.protein_7d) || 112;
  const bestRecovery = bestRecent(series.recovery_score);

  return {
    data,
    snapshotDate,
    generatedDay,
    generatedYear,
    sourceCount,
    readinessScore,
    readinessLabel: scoreLabel(readinessScore),
    recoveryScore,
    recoveryStatus: recoveryLabel(recoveryScore, recovery.delta),
    sleepDisplay: sleepMinutes === null ? "7h 15m" : formatDuration(sleepMinutes),
    sleepStatus: sleepLabel(sleepMinutes),
    sleepPerformance: sleepPerformanceScore,
    strainDisplay: formatNumber(strainValue, 1),
    strainStatus: strainLabel(strainValue),
    strainScore,
    rhr: formatNumber(metricNumber(restingHeartRate, 49)),
    hrv: formatNumber(metricNumber(hrv, 62), 1),
    respRate: "13.2",
    weight: formatNumber(weight.value || 65.8, 1),
    nutritionScore: 78,
    stressScore: 36,
    protein: formatNumber(proteinValue),
    calories: formatNumber(caloriesValue),
    hydration: "2.1 / 3 L",
    recoveryDelta: metricSigned(recovery, "%", 0, "+0%"),
    sleepDelta: metricSigned(sleepDuration, "m", 0, "+0m"),
    strainDelta: metricSigned(strain, "", 1, "+0"),
    hrvDelta: metricSigned(hrv, " ms", 1, "+0 ms"),
    rhrDelta: metricSigned(restingHeartRate, " bpm", 0, "+0 bpm"),
    weeklyLoad: weeklyLoad || 392,
    activityMinutes: activityMinutes || 312,
    trainingBalance: formatNumber(strainValue / 21, 1),
    bestRecoveryDay: bestRecovery?.date ? formatShortDate(bestRecovery.date) : "latest",
    bestRecoveryScore: bestRecovery?.value ? Math.round(bestRecovery.value) : readinessScore,
    readinessFocus: metricDelta(recovery, 0) < 0 ? "Recovery dip" : "Keep trend",
    recoveryPath: chartPath(series.recovery_score, "M22 112L88 92L150 104L218 80L288 98L354 76L420 92L498 70"),
    sleepPath: chartPath(series.sleep_duration, "M22 98L88 88L150 92L218 74L288 82L354 66L420 80L498 72"),
    recoveryAxis: axisLabels(series.recovery_score),
    sleepAxis: axisLabels(series.sleep_duration),
    strainSpark: sparkPoints(series.strain, "10,34 38,28 66,32 94,20 122,24 150,16 178,22 210,18"),
    weightSpark: sparkPoints(series.weight, "10,22 38,46 66,26 94,32 122,38 150,40 178,30 210,38")
  };
}

function Ring({ value, label, tone = "green", size = 118 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));

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
      aria-label={`${label || "Score"} ${value}%`}
      data-tooltip={`${label || "Score"}: ${value}%`}
      title={`${label || "Score"}: ${value}%`}
    >
      <span className="vitals-ai-ring-orbit" aria-hidden="true" />
      <span className="vitals-ai-ring-copy">
        <strong>{value}%</strong>
        {label ? <span className="vitals-ai-ring-label">{label}</span> : null}
      </span>
    </div>
  );
}

function TinyLine({ points, tone = "green" }) {
  return (
    <svg className={`vitals-ai-spark ${tone}`} viewBox="0 0 220 70" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function CardHeading({ icon: Icon, title, action, info = false }) {
  return (
    <header className="vitals-ai-card-heading">
      <div>
        {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
        <h2>{title}</h2>
      </div>
      {action ? (
        <button type="button">
          {action}
          <ArrowRight size={14} />
        </button>
      ) : info ? (
        <Info size={15} strokeWidth={1.8} />
      ) : null}
    </header>
  );
}

function ScoreBreakdown({ model }) {
  const rows = [
    ["Sleep", model.sleepPerformance, "green"],
    ["Recovery", model.recoveryScore, "green"],
    ["Strain", model.strainScore, "orange"],
    ["Nutrition", model.nutritionScore, "green"]
  ];

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
    <article className="vitals-ai-card vitals-score-card" data-card-metric="readiness" tabIndex={0}>
      <CardHeading icon={HeartPulse} title="Health Score" />
      <div className="vitals-score-main">
        <div>
          <strong>{model.readinessScore}</strong>
          <span>%</span>
          <small>{model.readinessLabel}</small>
          <p>{model.recoveryDelta} vs previous</p>
        </div>
        <Ring value={model.readinessScore} tone="green" size={116} />
        <ScoreBreakdown model={model} />
      </div>
      <footer>Generated {model.generatedDay} {model.generatedYear} from {model.sourceCount} sources <Info size={13} /></footer>
    </article>
  );
}

function RecoveryCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-recovery-card" data-card-metric="recovery" tabIndex={0}>
      <CardHeading icon={Droplet} title="Recovery" />
      <div className="vitals-recovery-layout">
        <div>
          <strong>{model.recoveryScore}</strong>
          <span>%</span>
          <small>{model.recoveryStatus}</small>
          <p>{model.recoveryDelta} vs previous</p>
        </div>
        <dl>
          <div className="vitals-hover-tip" data-tooltip={`HRV ${model.hrv} ms, ${model.hrvDelta}`} title={`HRV ${model.hrv} ms, ${model.hrvDelta}`}>
            <dt>HRV</dt>
            <dd>{model.hrv} ms</dd>
            <em>{model.hrvDelta}</em>
          </div>
          <div className="vitals-hover-tip" data-tooltip={`Resting HR ${model.rhr} bpm, ${model.rhrDelta}`} title={`Resting HR ${model.rhr} bpm, ${model.rhrDelta}`}>
            <dt>Resting HR</dt>
            <dd>{model.rhr} bpm</dd>
            <em>{model.rhrDelta}</em>
          </div>
          <div className="vitals-hover-tip" data-tooltip={`Respiratory rate ${model.respRate} brpm, -0.4`} title={`Respiratory rate ${model.respRate} brpm, -0.4`}>
            <dt>Resp. Rate</dt>
            <dd>{model.respRate} brpm</dd>
            <em>- 0.4</em>
          </div>
        </dl>
      </div>
      <svg className="vitals-ai-line-chart" viewBox="0 0 540 160" aria-hidden="true">
        <title>Recovery trend ending at {model.recoveryScore}%</title>
        <line x1="28" x2="512" y1="126" y2="126" />
        <path d={model.recoveryPath} />
        <circle cx="512" cy="70" r="4" />
      </svg>
      <div className="vitals-ai-axis">
        {model.recoveryAxis.map((label) => <span key={label}>{label}</span>)}
      </div>
    </article>
  );
}

function SleepCard({ model }) {
  const stages = [
    ["Deep", 16, "deep"],
    ["REM", 12, "rem"],
    ["Light", 22, "light"],
    ["Awake", 5, "awake"],
    ["Deep", 18, "deep"],
    ["REM", 10, "rem"],
    ["Light", 17, "light"]
  ];

  return (
    <article className="vitals-ai-card vitals-sleep-card" data-card-metric="sleep" tabIndex={0}>
      <CardHeading icon={Moon} title="Sleep" />
      <div className="vitals-sleep-top">
        <div>
          <strong>{model.sleepDisplay}</strong>
          <small>{model.sleepStatus}</small>
          <p>{model.sleepDelta} vs previous</p>
        </div>
        <Ring value={model.sleepPerformance} label="Quality" tone="blue" size={112} />
      </div>
      <div className="vitals-sleep-stages">
        <header>
          <span>Sleep Stages</span>
          <i className="deep" /> Deep
          <i className="rem" /> REM
          <i className="light" /> Light
          <i className="awake" /> Awake
        </header>
        <div className="vitals-sleep-bar">
          {stages.map(([label, width, tone], index) => (
            <b
              className={`vitals-hover-tip ${tone}`}
              data-tooltip={`${label}: ${width}%`}
              title={`${label}: ${width}%`}
              style={{ width: `${width}%` }}
              key={`${label}-${index}`}
            />
          ))}
        </div>
        <footer><span>23:05</span><span>06:53</span></footer>
      </div>
      <div className="vitals-sleep-foot">
        <span>Consistency <b>85%</b></span>
        <span>Sleep Debt <b>0h 15m</b> <em>Low</em></span>
      </div>
    </article>
  );
}

function TrainingLoadCard({ model }) {
  const bars = [58, 68, 76, 66, 84, 92, 72];
  const days = ["T", "F", "S", "S", "M", "T", "W"];

  return (
    <article className="vitals-ai-card vitals-training-card" data-card-metric="training" tabIndex={0}>
      <CardHeading icon={Zap} title="Training Load / Strain" />
      <div className="vitals-training-main">
        <div>
          <strong>{model.strainDisplay}</strong>
          <small>{model.strainStatus}</small>
          <p>{model.strainDelta} vs previous</p>
        </div>
        <div className="vitals-load-chart">
          <span>7-Day Load Trend</span>
          <div>
            {bars.map((bar, index) => (
              <i
                className="vitals-hover-tip"
                data-tooltip={`${days[index]} load: ${bar}`}
                title={`${days[index]} load: ${bar}`}
                style={{ height: `${bar}%`, "--bar-delay": `${index * 28}ms` }}
                key={index}
              />
            ))}
          </div>
          <footer>{days.map((day, index) => <em key={`${day}-${index}`}>{day}</em>)}</footer>
        </div>
      </div>
      <div className="vitals-training-stats">
        <div><span>Weekly Load</span><strong>{model.weeklyLoad}</strong><small>7 days</small></div>
        <div><span>Activity Minutes</span><strong>{model.activityMinutes}</strong><small>This week</small></div>
        <div><span>Training Balance</span><strong>{model.trainingBalance}</strong><small>Latest</small></div>
        <Ring value={model.strainScore} tone="green" size={72} />
      </div>
      <p className="vitals-card-note"><Info size={13} /> More aerobic work would support balance.</p>
    </article>
  );
}

function BodyMetricsCard({ model }) {
  const rows = [
    ["Weight", `${model.weight} kg`, "- 0.6 kg"],
    ["Body Fat", "21.3%", "- 0.2%"],
    ["Muscle Mass", "46.1 kg", "+ 0.4 kg"],
    ["VO2 Max", "48", "Good"]
  ];

  return (
    <article className="vitals-ai-card vitals-body-metrics-card" data-card-metric="body" tabIndex={0}>
      <CardHeading icon={Activity} title="Body Metrics" action="View trends" />
      <div className="vitals-body-metrics-layout">
        <dl>
          {rows.map(([label, value, delta]) => (
            <div className="vitals-hover-tip" data-tooltip={`${label}: ${value}, ${delta}`} title={`${label}: ${value}, ${delta}`} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
              <em>{delta}</em>
            </div>
          ))}
        </dl>
        <TinyLine points={model.weightSpark} tone="green" />
      </div>
      <div className="vitals-ai-axis"><span>30 May</span><span>2 Jun</span><span>5 Jun</span></div>
    </article>
  );
}

function NutritionCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-nutrition-card-v2" data-card-metric="nutrition" tabIndex={0}>
      <CardHeading icon={Droplet} title="Nutrition & Hydration" action="View details" />
      <div className="vitals-nutrition-v2-body">
        <Ring value={model.nutritionScore} label="Nutrition" tone="green" size={96} />
        <div>
          {[
            ["Calories", `${model.calories} / 2,200 kcal`, 82, "green"],
            ["Protein", `${model.protein} / 140 g`, 80, "green"],
            ["Hydration", model.hydration, 72, "blue"]
          ].map(([label, value, width, tone]) => (
            <section className="vitals-hover-tip" data-tooltip={`${label}: ${value}`} title={`${label}: ${value}`} key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <i><b className={tone} style={{ width: `${width}%` }} /></i>
            </section>
          ))}
        </div>
      </div>
      <footer>Micronutrient Status <strong>Good</strong><i /></footer>
    </article>
  );
}

function StressCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-stress-card" data-card-metric="stress" tabIndex={0}>
      <CardHeading icon={Activity} title="Stress & Mindfulness" action="View insights" />
      <div className="vitals-stress-body">
        <Ring value={model.stressScore} label="Low" tone="green" size={94} />
        <div>
          <span>7-Day Trend</span>
          <TinyLine points="10,46 38,46 66,42 94,22 122,38 150,26 178,40 210,34" tone="green" />
          <p>Mindful Minutes <strong>120 / 150 min</strong></p>
          <i><b style={{ width: "80%" }} /></i>
        </div>
      </div>
    </article>
  );
}

function TrendsCard() {
  const rows = [
    ["HRV", "Trending up", "+ 8%", "up"],
    ["Resting HR", "Trending down", "- 4 bpm", "down"],
    ["Sleep Quality", "Improving", "+ 6%", "up"],
    ["Body Weight", "Stable", "- 0.6 kg", "flat"]
  ];

  return (
    <article className="vitals-ai-card vitals-trends-card" data-card-metric="trends" tabIndex={0}>
      <CardHeading title="Trends Summary" action="View all" />
      <div className="vitals-trends-list">
        {rows.map(([label, state, delta, tone]) => (
          <div className="vitals-hover-tip" data-tooltip={`${label}: ${state}, ${delta}`} title={`${label}: ${state}, ${delta}`} key={label}>
            <span>{label}</span>
            <strong className={tone}>{state}</strong>
            <em>{delta}</em>
            <TinyLine points="10,38 42,35 74,37 106,31 138,34 170,29 210,32" tone="green" />
            <ArrowRight size={14} />
          </div>
        ))}
      </div>
    </article>
  );
}

function ReadinessHabitsCard({ model }) {
  const rows = ["WHOOP", "Training", "Nutrition", "Sleep", "Mindfulness"];
  const pattern = ["high", "mid", "high", "soft", "high", "none", "watch", "high", "high", "high", "mid", "high", "none", "soft"];

  return (
    <article className="vitals-ai-card vitals-habits-card" data-card-metric="habits" tabIndex={0}>
      <div className="vitals-habits-board">
        <header>
          <h2>Daily Readiness & Habits</h2>
          <p>Live readiness and habit adherence</p>
        </header>
        <div className="vitals-habit-days">
          {habitDays.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div className="vitals-habit-row" key={row}>
            <span>{row}</span>
            {pattern.map((cell, index) => {
              const status = pattern[(index + rowIndex * 2) % pattern.length];
              const tooltip = `${row} ${habitDays[index]}: ${habitStatusLabels[status]}`;

              return (
                <i
                  className={`vitals-hover-tip ${status}`}
                  data-tooltip={tooltip}
                  title={tooltip}
                  style={{ "--cell-delay": `${(rowIndex * 14 + index) * 8}ms` }}
                  key={`${row}-${cell}-${index}`}
                />
              );
            })}
          </div>
        ))}
        <footer>
          <span><i className="high" /> Optimal</span>
          <span><i className="mid" /> Good</span>
          <span><i className="watch" /> Needs attention</span>
          <span><i className="none" /> No data</span>
        </footer>
      </div>
      <aside className="vitals-weekly-readiness">
        <header>
          <h3>Weekly Readiness</h3>
          <ArrowRight size={15} />
        </header>
        <strong>{model.readinessScore}% <span>{model.recoveryDelta}</span></strong>
        <TinyLine points="10,48 42,42 74,38 106,45 138,30 170,36 202,31 232,34" tone="green" />
        <div>
          <span>Best Day <b>{model.bestRecoveryDay}</b></span>
          <span>{model.bestRecoveryScore}%</span>
          <span>Focus Area <b>{model.readinessFocus}</b></span>
        </div>
      </aside>
    </article>
  );
}

function InsightsCard({ model }) {
  const [activeTab, setActiveTab] = useState("top");
  const rows = [
    ["Iron handling", "Low ferritin/iron saturation trend continues. Consider reviewing iron intake and sources.", "Clinician", "amber", "watch"],
    ["Late bedtimes impacting deep sleep", "You have had 4 late bedtimes this week. Aim for an earlier wind-down routine.", "Lifestyle", "orange", "watch"],
    ["Nice work on training balance", "Your aerobic base and strain balance look great. Keep it up!", "Positive", "green", "positive"],
    ["Hydration dip on training days", "Hydration was below target on 2 training days this week.", "Monitor", "teal", "watch"]
  ];
  const visibleRows = activeTab === "positive"
    ? rows.filter((row) => row[4] === "positive")
    : activeTab === "watch"
      ? rows.filter((row) => row[4] === "watch")
      : rows;
  const positiveCount = rows.filter((row) => row[4] === "positive").length;
  const watchCount = rows.filter((row) => row[4] === "watch").length;
  const tabs = [
    ["top", "Top Priorities", null],
    ["positive", "Positive Signals", positiveCount],
    ["watch", "Watchlist", watchCount],
    ["all", "All Insights", null]
  ];

  return (
    <article className="vitals-ai-card vitals-insights-card" data-card-metric="insights" tabIndex={0}>
      <div className="vitals-insights-main">
        <header>
          <div>
            <h2>Health Intelligence & Insights</h2>
            <p>AI-powered insights and actionable recommendations</p>
          </div>
          <button type="button">View all insights <ArrowRight size={14} /></button>
        </header>
        <nav>
          {tabs.map(([key, label, count]) => (
            <button
              type="button"
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
              aria-pressed={activeTab === key}
              key={key}
            >
              {label} {count ? <span>{count}</span> : null}
            </button>
          ))}
        </nav>
        <div className="vitals-insight-list">
          {visibleRows.map(([title, detail, tag, tone], index) => (
            <button
              type="button"
              className="vitals-insight-row vitals-hover-tip"
              aria-label={`${tag}: ${title}. ${detail}`}
              data-tooltip={`${tag}: ${detail}`}
              title={`${tag}: ${detail}`}
              key={title}
            >
              <em>{index + 1}</em>
              <i className={tone}>{tag.slice(0, 1)}</i>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <b>{tag}</b>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      </div>
      <aside className="vitals-next-action" style={{ backgroundImage: `url(${bannerImage})` }}>
        <div>
          <span>Your Next Best Action</span>
          <strong>Focus on earlier bedtimes and iron-rich foods this week.</strong>
          <button type="button">View Plan <ArrowRight size={14} /></button>
        </div>
      </aside>
    </article>
  );
}

export function vitalsSnapshotLabel(snapshotDate, range, snapshotIndex) {
  const end = dateFromISO(snapshotDate);
  if (!end) return formatShortDate(snapshotDate);

  return formatShortDate(isoDate(addDays(end, -snapshotIndex * rangeDays(range))));
}

export function getVitalsSnapshotDate(data) {
  return (
    data?.snapshotDate ||
    data?.latest?.recovery_score?.date ||
    String(data?.generatedAt || "").slice(0, 10) ||
    null
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
  const [activeMetric, setActiveMetric] = useState("readiness");
  const range = rangeProp ?? internalRange;
  const snapshotIndex = snapshotIndexProp ?? internalSnapshotIndex;
  const setRange = rangeProp !== undefined && onRangeChange ? onRangeChange : setInternalRange;

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

  const model = useMemo(() => buildModel(runtimeHealthData), [runtimeHealthData]);
  const rangeEndDate = useMemo(() => {
    const end = dateFromISO(model.snapshotDate);
    if (!end) return model.snapshotDate;

    return isoDate(addDays(end, -snapshotIndex * rangeDays(range)));
  }, [model.snapshotDate, range, snapshotIndex]);

  function moveSnapshot(direction) {
    const next = (current) => Math.max(0, Math.min(3, current - direction));

    if (snapshotIndexProp !== undefined && onSnapshotIndexChange) {
      onSnapshotIndexChange(next(snapshotIndex));
    } else {
      setInternalSnapshotIndex(next);
    }
  }

  const heroMetrics = [
    {
      key: "readiness",
      className: "primary",
      label: "Overall Readiness",
      value: model.readinessScore,
      suffix: "%",
      status: model.readinessLabel,
      detail: `${model.recoveryDelta} vs previous`
    },
    {
      key: "recovery",
      icon: HeartPulse,
      label: "Recovery",
      value: model.recoveryStatus,
      detail: model.recoveryDelta
    },
    {
      key: "sleep",
      icon: Moon,
      label: "Sleep",
      value: model.sleepStatus,
      detail: model.sleepDisplay
    },
    {
      key: "training",
      icon: Activity,
      label: "Training Balance",
      value: model.strainStatus,
      detail: model.strainDisplay
    }
  ];

  return (
    <section className={`vitals-ai-dashboard ${compact ? "is-compact" : ""}`} aria-label="Vitals dashboard">
      <div className="vitals-ai-shell">
        <section className="vitals-ai-hero">
          <div className="vitals-hero-landscape" style={{ backgroundImage: `url(${bannerImage})` }}>
            <header className="vitals-hero-topbar">
              <p className="vitals-hero-eyebrow">
                Vitals <em>Health Intelligence</em>
              </p>
              <div className="vitals-hero-metrics">
                {heroMetrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <button
                      type="button"
                      className={`${metric.className || ""} ${activeMetric === metric.key ? "active" : ""}`}
                      onMouseEnter={() => setActiveMetric(metric.key)}
                      onFocus={() => setActiveMetric(metric.key)}
                      onClick={() => setActiveMetric(metric.key)}
                      aria-pressed={activeMetric === metric.key}
                      key={metric.key}
                    >
                      {Icon ? <Icon size={18} /> : null}
                      <span>{metric.label}</span>
                      <strong>
                        {metric.value}
                        {metric.suffix ? <em>{metric.suffix}</em> : null}
                      </strong>
                      <small>{metric.status ? `${metric.status} ` : ""}<b>{metric.detail}</b></small>
                    </button>
                  );
                })}
              </div>
              <div className="vitals-ai-controls">
                <div className="vitals-ai-date">
                  <button type="button" onClick={() => moveSnapshot(-1)} aria-label="Previous dashboard snapshot"><ChevronLeft size={17} /></button>
                  <span>Snapshot {formatShortDate(rangeEndDate)}</span>
                  <button type="button" onClick={() => moveSnapshot(1)} aria-label="Next dashboard snapshot"><ChevronRight size={17} /></button>
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
          </div>
        </section>

        <section className="vitals-ai-grid" data-focused-metric={activeMetric}>
          <HealthScoreCard model={model} />
          <RecoveryCard model={model} />
          <SleepCard model={model} />
          <TrainingLoadCard model={model} />
          <BodyMetricsCard model={model} />
          <NutritionCard model={model} />
          <StressCard model={model} />
          <TrendsCard />
          <ReadinessHabitsCard model={model} />
          <InsightsCard model={model} />
        </section>
      </div>
    </section>
  );
}
