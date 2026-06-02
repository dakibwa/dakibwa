"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Droplet,
  FileText,
  HeartPulse,
  Info,
  Moon,
  Plus,
  Upload,
  X,
} from "lucide-react";

import healthData from "@/data/health-data.json";

const tones = {
  green: "#208768",
  teal: "#0b6874",
  orange: "#e7902f",
  coral: "#e46f43",
  ink: "#081216"
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

function formatDate(value) {
  if (!value) return "latest";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "latest";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parsed);
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

function formatDuration(minutes) {
  const numeric = numberValue(minutes);
  if (numeric === null) return "--";
  const total = Math.round(numeric);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function signedDelta(value, unit = "", digits = 0) {
  const numeric = numberValue(value);
  if (numeric === null) return "No comparison";
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  const formatted = formatNumber(Math.abs(numeric), digits);

  return `${sign}${formatted}${unit ? ` ${unit}` : ""} vs previous`;
}

function signedDurationDelta(value) {
  const numeric = numberValue(value);
  if (numeric === null) return "No comparison";
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";

  return `${sign}${formatDuration(Math.abs(numeric))} vs previous`;
}

function sourceName(source) {
  const names = {
    whoop: "WHOOP",
    strava: "Strava",
    "progress-pic": "Progress",
    fitbit: "Fitbit",
    googlefit: "Google Fit"
  };

  return names[source] || String(source || "Source");
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

function sourceFreshness(source) {
  const ageDays = daysBetween(source?.latestDay, healthData.snapshotDate);
  if (ageDays !== null && ageDays <= 7) return { label: "Current", color: tones.green, ageDays };
  if (ageDays !== null && ageDays <= 35) return { label: "Review", color: tones.orange, ageDays };

  return { label: "Older", color: tones.coral, ageDays };
}

function sparkPoints(points, fallback) {
  const sample = (points || [])
    .map((point) => numberValue(point.value))
    .filter((value) => value !== null)
    .slice(-9);

  if (sample.length < 2) return fallback;

  const min = Math.min(...sample);
  const max = Math.max(...sample);
  const range = max - min || 1;

  return sample
    .map((value, index) => {
      const x = 80 + index * 16;
      const y = 66 - ((value - min) / range) * 34;

      return `${x},${Math.round(y)}`;
    })
    .join(" ");
}

function linePath(points, fallback) {
  const sample = (points || [])
    .map((point) => ({ ...point, value: numberValue(point.value) }))
    .filter((point) => point.value !== null)
    .slice(-12);

  if (sample.length < 2) return fallback;

  const min = Math.min(...sample.map((point) => point.value));
  const max = Math.max(...sample.map((point) => point.value));
  const range = max - min || 1;

  return sample
    .map((point, index) => {
      const x = 22 + (index / (sample.length - 1)) * 574;
      const y = 196 - ((point.value - min) / range) * 112;

      return `${index === 0 ? "M" : "L"}${Math.round(x)} ${Math.round(y)}`;
    })
    .join("");
}

function compactReviewTitle(title) {
  return String(title || "Review")
    .replace(" is the main follow-up thread", "")
    .replace("Wearables show ", "")
    .replace(" is visible enough to manage", "")
    .replace(" data is useful but older", " freshness");
}

const sourceCoverage = healthData.sourceCoverage || [];
const latest = healthData.latest || {};
const nutritionLatest = healthData.nutrition?.latest || {};
const reviewPrompts = healthData.reviewPrompts || [];
const series = healthData.series || {};

const latestRecovery = latest.recovery_score || {};
const latestSleepDuration = latest.sleep_duration || {};
const latestSleepPerformance = latest.sleep_performance || {};
const latestStrain = latest.strain || {};
const latestHrv = latest.hrv || {};
const latestRestingHeartRate = latest.heart_rate_resting || {};
const latestWeight = latest.weight || {};
const latestCalories = series.calories_burned?.at(-1) || latest.calories_burned || {};
const latestSteps = series.steps?.at(-1) || {};
const healthScore = Math.round(numberValue(latestRecovery.value) ?? 0);

const snapshots = [
  {
    label: `Snapshot ${formatShortDate(healthData.snapshotDate)}`,
    caption: "Live aggregate health data",
    recency: "Latest aggregate",
    summary: `Generated ${formatDate(healthData.generatedAt)} from ${sourceCoverage.length} source groups.`
  },
  {
    label: `WHOOP ${formatShortDate(latestRecovery.date)}`,
    caption: "Wearable values visible",
    recency: "Wearable window",
    summary: `Recovery ${formatNumber(latestRecovery.value)}%, RHR ${formatNumber(latestRestingHeartRate.value)} bpm, HRV ${formatNumber(latestHrv.value)} ms.`
  },
  {
    label: "Source audit view",
    caption: "Freshness first",
    recency: "Audit view",
    summary: "Raw exports stay out of the repo while the aggregate website view shows values and source age."
  }
];

const ranges = ["7 days", "14 days", "30 days"];

const focusOptions = [
  { key: "all", label: "All" },
  { key: "review", label: "Review" },
  { key: "sources", label: "Sources" },
  { key: "labs", label: "Labs" },
  { key: "activity", label: "Activity" }
];

const focusCards = {
  review: ["review", "readiness", "labs", "recent"],
  sources: ["sources", "readiness", "recent"],
  labs: ["labs", "review"],
  activity: ["activity", "recent", "strain"]
};

const baseTopStats = [
  {
    key: "score",
    label: "Health Score",
    value: formatNumber(healthScore),
    unit: "%",
    status: `Snapshot ${formatShortDate(healthData.snapshotDate)}`,
    trend: "Recovery-led aggregate score",
    tone: "green",
    ring: healthScore
  },
  {
    key: "recovery",
    label: "Recovery",
    value: formatNumber(latestRecovery.value),
    unit: "%",
    status: `WHOOP ${formatShortDate(latestRecovery.date)}`,
    trend: signedDelta(latestRecovery.delta, "%"),
    tone: "green",
    ring: Math.round(numberValue(latestRecovery.value) ?? 0)
  },
  {
    key: "sleep",
    label: "Sleep",
    value: formatDuration(latestSleepDuration.value),
    unit: "",
    status: `${formatNumber(latestSleepPerformance.value)}% performance`,
    trend: signedDurationDelta(latestSleepDuration.delta),
    tone: "teal",
    spark: sparkPoints(series.sleep_duration, "80,52 96,42 112,49 128,35 144,43 160,38 176,55 192,47 208,62")
  },
  {
    key: "strain",
    label: "Strain",
    value: formatNumber(latestStrain.value, 1),
    unit: "load",
    status: `WHOOP ${formatShortDate(latestStrain.date)}`,
    trend: signedDelta(latestStrain.delta, "", 1),
    tone: "teal",
    spark: sparkPoints(series.strain, "80,39 96,34 112,38 128,36 144,44 160,47 176,54 192,52 208,58")
  }
];

const miniMetrics = [
  {
    key: "review",
    label: "Resting Heart Rate",
    value: `${formatNumber(latestRestingHeartRate.value)} bpm`,
    detail: signedDelta(latestRestingHeartRate.delta, "bpm"),
    icon: HeartPulse,
    tone: "green",
    spark: sparkPoints(series.recovery_score, "18,57 38,61 58,50 78,54 98,49 118,58 138,52 158,55 178,45 198,53 218,47")
  },
  {
    key: "sources",
    label: "HRV",
    value: `${formatNumber(latestHrv.value)} ms`,
    detail: signedDelta(latestHrv.delta, "ms", 1),
    icon: Activity,
    tone: "teal",
    spark: sparkPoints(series.recovery_score, "18,57 38,61 58,50 78,54 98,49 118,58 138,52 158,55 178,45 198,53 218,47")
  },
  {
    key: "sources",
    label: "Sleep Performance",
    value: `${formatNumber(latestSleepPerformance.value)}%`,
    detail: signedDelta(latestSleepPerformance.delta, "pp"),
    icon: Moon,
    tone: "coral",
    spark: sparkPoints(series.sleep_duration, "18,57 38,61 58,50 78,54 98,49 118,58 138,52 158,55 178,45 198,53 218,47")
  },
  {
    key: "sources",
    label: "Weight",
    value: `${formatNumber(latestWeight.value, 1)} kg`,
    detail: `${signedDelta(latestWeight.delta, "kg", 1)} / ${formatShortDate(latestWeight.date)}`,
    icon: Droplet,
    tone: "teal",
    spark: sparkPoints(series.weight, "18,57 38,61 58,50 78,54 98,49 118,58 138,52 158,55 178,45 198,53 218,47")
  }
];

const sourceRows = sourceCoverage.map((source) => {
  const freshness = sourceFreshness(source);

  return [sourceName(source.source), freshness.label, freshness.color, source];
});

const readinessRows = [
  ["WHOOP", ["high", "mid", "mid", "high", "high", "", "mid"]],
  ["Training", ["mid", "mid", "high", "high", "watch", "", "mid"]],
  ["Nutrition", ["high", "mid", "", "mid", "mid", "watch", ""]],
  ["Labs", ["mid", "high", "high", "mid", "", "", ""]]
];

const reviewRows = reviewPrompts.slice(0, 4).map((prompt) => [
  compactReviewTitle(prompt.title),
  prompt.priority,
  prompt.detail
]);

const labRows = [
  ["Recovery", `${formatNumber(latestRecovery.value)}%`, `WHOOP ${formatShortDate(latestRecovery.date)}`],
  ["RHR", `${formatNumber(latestRestingHeartRate.value)} bpm`, `WHOOP ${formatShortDate(latestRestingHeartRate.date)}`],
  ["HRV", `${formatNumber(latestHrv.value)} ms`, `WHOOP ${formatShortDate(latestHrv.date)}`],
  ["Weight", `${formatNumber(latestWeight.value, 1)} kg`, `Body comp ${formatShortDate(latestWeight.date)}`],
  ["Nutrition", `${formatNumber(nutritionLatest.kcal_7d)} kcal`, `7d avg ${formatShortDate(nutritionLatest.date)}`]
];

const nutritionBars = [
  { label: "P", title: "Protein", value: nutritionLatest.protein_7d, scale: 150 },
  { label: "F", title: "Fat", value: nutritionLatest.fat_7d, scale: 180 },
  { label: "C", title: "Net carb", value: nutritionLatest.netcarb_7d, scale: 280 },
  { label: "Fi", title: "Fiber", value: nutritionLatest.fiber_7d, scale: 35 },
  { label: "St", title: "Starch", value: nutritionLatest.starch_7d, scale: 80 },
  { label: "S", title: "Sugar", value: nutritionLatest.sugar_7d, scale: 240 },
  { label: "K", title: "Calories", value: nutritionLatest.kcal_7d, scale: 3400 }
].map((item) => ({
  ...item,
  height: `${Math.max(8, Math.min(100, ((numberValue(item.value) ?? 0) / item.scale) * 100))}%`
}));

const trendPaths = {
  recovery: linePath(series.recovery_score, "M22 168L148 162L284 164L420 150L596 156"),
  sleep: linePath(series.sleep_duration, "M22 110L174 104L318 104L462 86L596 102")
};

const panels = {
  review: {
    title: "Review Queue",
    kicker: "Live aggregate prompts",
    body: "Review prompts are grouped by clinical usefulness, freshness, and source confidence. They surface the health signals directly while keeping diagnosis and treatment decisions out of the website copy.",
    rows: reviewPrompts.map((prompt) => `${prompt.title}: ${prompt.detail}`)
  },
  sources: {
    title: "Source Freshness",
    kicker: "Aggregate source map",
    body: "The page can publish aggregate values and source freshness. Raw exports, identifiers, and source files still stay outside the public repository.",
    rows: sourceCoverage.map((source) => {
      const freshness = sourceFreshness(source);
      const ageCopy = freshness.ageDays === null ? "unknown age" : `${freshness.ageDays} days behind snapshot`;

      return `${sourceName(source.source)}: ${formatNumber(source.rows)} rows, latest ${formatDate(source.latestDay)}, ${ageCopy}.`;
    })
  },
  labs: {
    title: "Health Data Summary",
    kicker: "Values visible",
    body: "This panel shows the aggregate values already in the website data file. It is for tracking and review conversations, not diagnosis or treatment advice.",
    rows: labRows.map(([label, value, detail]) => `${label}: ${value} / ${detail}`)
  },
  activity: {
    title: "Quick Actions",
    kicker: "Dashboard controls",
    body: "Actions demonstrate the intended dashboard flow. They change the visible interface only; they do not upload records or write new health source data.",
    rows: ["Log Symptom opens the review context panel.", "Add Measure routes to current aggregate values.", "Share Report is shown as a review workflow, not a medical export."]
  }
};

function isFocused(focus, key) {
  if (focus === "all") {
    return false;
  }

  return focusCards[focus]?.includes(key);
}

function focusClass(focus, key) {
  if (focus === "all") {
    return "";
  }

  return isFocused(focus, key) ? " is-focus-match" : " is-focus-muted";
}

function Ring({ percent, color }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg className="vitals-ring" viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r={radius} className="vitals-ring-track" />
      <circle
        cx="42"
        cy="42"
        r={radius}
        className="vitals-ring-value"
        style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
      />
    </svg>
  );
}

function TinySparkline({ points, color }) {
  return (
    <svg className="vitals-sparkline" viewBox="0 0 240 84" aria-hidden="true">
      <path d={`M${points}`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ stat, focus }) {
  const color = tones[stat.tone] || tones.green;

  return (
    <article className={`vitals-card vitals-stat-card${focusClass(focus, stat.key)}`}>
      <header>
        <span>{stat.label}</span>
        <Info size={13} strokeWidth={1.8} />
      </header>
      <div className="vitals-stat-body">
        <div>
          <strong>{stat.value}</strong>
          {stat.unit ? <em>{stat.unit}</em> : null}
          <small className={stat.tone}>{stat.status}</small>
        </div>
        {stat.ring ? <Ring percent={stat.ring} color={color} /> : <TinySparkline points={stat.spark} color={color} />}
      </div>
      <p>{stat.trend}</p>
    </article>
  );
}

function MiniMetric({ metric, focus }) {
  const Icon = metric.icon;

  return (
    <article className={`vitals-card vitals-mini-card${focusClass(focus, metric.key)}`}>
      <header>
        <span>
          <Icon size={16} strokeWidth={1.8} />
          {metric.label}
        </span>
      </header>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
      <TinySparkline points={metric.spark} color={tones[metric.tone]} />
    </article>
  );
}

function ReadinessCard({ focus }) {
  return (
    <article className={`vitals-card vitals-readiness-card${focusClass(focus, "readiness")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Daily Readiness</h2>
          <p>Live source signal board</p>
        </div>
        <Info size={14} strokeWidth={1.8} />
      </header>
      <div className="vitals-heatmap" aria-label="Readiness source heatmap">
        <div className="vitals-heatmap-days" aria-hidden="true">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        {readinessRows.map(([label, cells]) => (
          <div className="vitals-heatmap-row" key={label}>
            <span>{label}</span>
            {cells.map((cell, index) => (
              <i className={cell} key={`${label}-${index}`} />
            ))}
          </div>
        ))}
      </div>
      <footer className="vitals-legend">
        <span>
          <i className="watch" /> Review
        </span>
        <span>
          <i className="mid" /> Source
        </span>
        <span>
          <i className="high" /> Ready
        </span>
      </footer>
    </article>
  );
}

function SourceCard({ focus, onOpen }) {
  return (
    <article className={`vitals-card vitals-source-card${focusClass(focus, "sources")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Source Freshness</h2>
          <p>Aggregate values visible; source files stay separate</p>
        </div>
        <button type="button" onClick={onOpen}>Details <ArrowRight size={14} /></button>
      </header>
      <div className="vitals-source-layout">
        <div className="vitals-source-ring">
          <strong>{sourceCoverage.length}</strong>
          <span>source groups</span>
        </div>
        <div className="vitals-source-list">
          {sourceRows.map(([label, status, color]) => (
            <div key={label}>
              <span>
                <i style={{ background: color }} />
                {label}
              </span>
              <strong>{status}</strong>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function TrendCard({ range, focus, onRangeClick }) {
  return (
    <article className={`vitals-card vitals-line-card${focusClass(focus, "review")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Recovery & Sleep</h2>
          <p>Latest aggregate trend values</p>
        </div>
        <button type="button" onClick={onRangeClick}>{range} <ChevronDown size={14} /></button>
      </header>
      <div className="vitals-chart-legend">
        <span><i className="green" /> Recovery</span>
        <span><i className="teal" /> Sleep duration</span>
      </div>
      <svg className="vitals-trend-chart" viewBox="0 0 620 260" role="img" aria-label="Live recovery and sleep trend">
        {[40, 92, 144, 196].map((y) => (
          <line key={y} x1="18" x2="598" y1={y} y2={y} />
        ))}
        <path d={trendPaths.recovery} className="green" />
        <path d={trendPaths.sleep} className="teal" />
      </svg>
    </article>
  );
}

function NutritionCard({ focus }) {
  return (
    <article className={`vitals-card vitals-nutrition-card${focusClass(focus, "sources")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Nutrition</h2>
          <p>7-day rolling average from {formatShortDate(nutritionLatest.date)}</p>
        </div>
        <Info size={14} />
      </header>
      <strong>{formatNumber(nutritionLatest.kcal_7d)}<span>kcal / day</span></strong>
      <small>
        Protein {formatNumber(nutritionLatest.protein_7d, 1)}g / fat {formatNumber(nutritionLatest.fat_7d, 1)}g / net carb {formatNumber(nutritionLatest.netcarb_7d, 1)}g.
      </small>
      <div className="vitals-bars" aria-label="Nutrition aggregate bars">
        {nutritionBars.map((item) => (
          <span style={{ "--height": item.height }} title={`${item.title}: ${formatNumber(item.value, 1)}`} key={item.label}>
            <i />
            <em>{item.label}</em>
          </span>
        ))}
      </div>
    </article>
  );
}

function ReviewCard({ focus, onOpen }) {
  return (
    <article className={`vitals-card vitals-review-card${focusClass(focus, "review")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Review Prompts</h2>
          <p>Source-backed questions for health conversations</p>
        </div>
        <Info size={14} />
      </header>
      <div className="vitals-review-list">
        {reviewRows.map(([label, status, detail], index) => (
          <div key={label}>
            {index < 2 ? <CheckCircle2 size={17} /> : <Circle size={17} />}
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <em>{status}</em>
          </div>
        ))}
      </div>
      <button type="button" className="vitals-text-link" onClick={onOpen}>
        View source map
        <ArrowRight size={15} />
      </button>
    </article>
  );
}

function LabsCard({ focus, onOpen }) {
  return (
    <article className={`vitals-card vitals-labs-card${focusClass(focus, "labs")}`} id="vitals-labs">
      <header className="vitals-card-heading">
        <div>
          <h2>Health Data Summary</h2>
          <p>Latest aggregate records from the website data file</p>
        </div>
        <button type="button" onClick={onOpen}>View values <ArrowRight size={15} /></button>
      </header>
      <div className="vitals-lab-grid">
        {labRows.map(([label, value, detail]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
            <i />
          </div>
        ))}
      </div>
      <footer>
        <CheckCircle2 size={16} />
        Aggregate values are visible; raw source exports and identifiers stay out of the repository.
      </footer>
    </article>
  );
}

function RecentCard({ focus, onOpenReview, onOpenSources, onOpenActions }) {
  return (
    <article className={`vitals-card vitals-recent-card${focusClass(focus, "recent")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Upcoming & Recent</h2>
          <p>Review trail</p>
        </div>
        <Info size={14} />
      </header>
      <div className="vitals-event-list">
        <div className="is-active">
          <CalendarDays size={20} />
          <span>
            <strong>Clinician review thread</strong>
            <small>{reviewPrompts[0]?.title || "Current health review prompt"}</small>
          </span>
          <button type="button" onClick={onOpenReview}>Open note</button>
        </div>
        <div>
          <CalendarDays size={20} />
          <span>
            <strong>Snapshot generated</strong>
            <small>{formatDate(healthData.generatedAt)} / {sourceCoverage.length} source groups</small>
          </span>
          <button type="button" onClick={onOpenSources}>Review</button>
        </div>
      </div>
      <button type="button" className="vitals-text-link" onClick={onOpenActions}>View all actions <ArrowRight size={15} /></button>
    </article>
  );
}

function ActionsCard({ focus, onOpen }) {
  const actions = [
    [ClipboardList, "Log Symptom", "review"],
    [Plus, "Add Measure", "labs"],
    [Upload, "Source Freshness", "sources"],
    [FileText, "Share Report", "review"]
  ];

  return (
    <article className={`vitals-card vitals-actions-card${focusClass(focus, "activity")}`} id="vitals-actions">
      <header className="vitals-card-heading">
        <div>
          <h2>Quick Actions</h2>
          <p>Dashboard controls</p>
        </div>
      </header>
      <div>
        {actions.map(([Icon, label, panel]) => (
          <button type="button" key={label} onClick={() => onOpen(panel)}>
            <Icon size={20} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function VitalsDashboardPreview({ compact = false }) {
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const [rangeIndex, setRangeIndex] = useState(0);
  const [focus, setFocus] = useState("all");
  const [activePanel, setActivePanel] = useState(null);

  const snapshot = snapshots[snapshotIndex];
  const range = ranges[rangeIndex];
  const panel = activePanel ? panels[activePanel] : null;

  const topStats = useMemo(
    () =>
      baseTopStats.map((stat) => ({
        ...stat,
        trend:
          stat.key === "score"
            ? snapshot.summary
            : stat.key === "recovery"
              ? `${snapshot.recency} / ${range} / ${stat.trend}`
              : stat.trend
      })),
    [range, snapshot]
  );

  function moveSnapshot(direction) {
    setSnapshotIndex((current) => (current + direction + snapshots.length) % snapshots.length);
  }

  function openPanel(key) {
    setActivePanel(key);
    if (key === "sources") setFocus("sources");
    if (key === "labs") setFocus("labs");
    if (key === "review") setFocus("review");
    if (key === "activity") setFocus("activity");
  }

  return (
    <section
      className={`vitals-dashboard ${compact ? "is-compact" : ""} ${focus !== "all" ? "is-filtering" : ""}`}
      aria-label="Vitals dashboard"
    >
      <div className="vitals-shell">
        <header className="vitals-topbar">
          <div>
            <h1>Health Overview</h1>
            <p>{snapshot.caption}</p>
          </div>
          <div className="vitals-header-actions">
            <div className="vitals-date-control" aria-label="Dashboard snapshot">
              <button type="button" onClick={() => moveSnapshot(-1)} aria-label="Previous dashboard snapshot">
                <ChevronLeft size={18} />
              </button>
              <span>{snapshot.label}</span>
              <CalendarDays size={16} />
              <button type="button" onClick={() => moveSnapshot(1)} aria-label="Next dashboard snapshot">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="vitals-range-control" aria-label="Dashboard range">
              {ranges.map((option, index) => (
                <button
                  type="button"
                  className={index === rangeIndex ? "is-active" : ""}
                  aria-pressed={index === rangeIndex}
                  onClick={() => setRangeIndex(index)}
                  key={option}
                >
                  {option.replace(" days", "d")}
                </button>
              ))}
            </div>
            <button type="button" className="vitals-icon-button" aria-label="Notifications" onClick={() => openPanel("review")}>
              <Bell size={20} strokeWidth={1.7} />
            </button>
            <div className="vitals-avatar" aria-label="Health profile">
              VT
            </div>
          </div>
        </header>

        <section className="vitals-source-strip" aria-label="Source freshness summary">
          {sourceRows.map(([label, status, color]) => (
            <button type="button" onClick={() => openPanel(label === "Labs" ? "labs" : "sources")} key={label}>
              <i style={{ background: color }} />
              <span>{label}</span>
              <strong>{status}</strong>
            </button>
          ))}
        </section>

        <section className="vitals-focus-tabs" aria-label="Dashboard focus">
          {focusOptions.map((option) => (
            <button
              type="button"
              className={focus === option.key ? "is-active" : ""}
              aria-pressed={focus === option.key}
              onClick={() => setFocus(option.key)}
              key={option.key}
            >
              {option.label}
            </button>
          ))}
        </section>

        <section className="vitals-dashboard-grid">
          {topStats.map((stat) => (
            <StatCard stat={stat} focus={focus} key={stat.label} />
          ))}
          <ReadinessCard focus={focus} />

          {miniMetrics.map((metric) => (
            <MiniMetric metric={metric} focus={focus} key={metric.label} />
          ))}
          <ReviewCard focus={focus} onOpen={() => openPanel("sources")} />

          <TrendCard
            range={range}
            focus={focus}
            onRangeClick={() => setRangeIndex((current) => (current + 1) % ranges.length)}
          />
          <SourceCard focus={focus} onOpen={() => openPanel("sources")} />
          <NutritionCard focus={focus} />

          <LabsCard focus={focus} onOpen={() => openPanel("labs")} />
          <RecentCard
            focus={focus}
            onOpenReview={() => openPanel("review")}
            onOpenSources={() => openPanel("sources")}
            onOpenActions={() => openPanel("activity")}
          />
          <ActionsCard focus={focus} onOpen={openPanel} />
        </section>

        {panel ? (
          <aside className="vitals-detail-panel" aria-live="polite">
            <header>
              <span>{panel.kicker}</span>
              <button type="button" onClick={() => setActivePanel(null)} aria-label="Close dashboard detail">
                <X size={17} />
              </button>
            </header>
            <h2>{panel.title}</h2>
            <p>{panel.body}</p>
            <ul>
              {panel.rows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </aside>
        ) : null}

        <footer className="vitals-privacy-note">
          <CheckCircle2 size={15} />
          Live aggregate health values are published here; raw exports, identifiers, and source files stay out of the public repo.
        </footer>
      </div>
    </section>
  );
}
