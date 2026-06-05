"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplet,
  HeartPulse,
  Info,
  Moon,
  Zap
} from "lucide-react";

import fallbackHealthData from "@/data/public-health-data.json";

const remoteVitalsDataUrl = (
  process.env.NEXT_PUBLIC_VITALS_DATA_URL || "https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals"
).trim();

const bannerImage = "/project-images/vitals/vitals-botanical-banner.png";

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

function formatRangeWindow(endDate, range) {
  const end = dateFromISO(endDate);
  if (!end) return "Snapshot";

  const start = addDays(end, -(rangeDays(range) - 1));

  return `${formatShortDate(isoDate(start))} - ${formatShortDate(isoDate(end))}`;
}

function formatDuration(minutes) {
  const numeric = numberValue(minutes);
  if (numeric === null) return "--";
  const total = Math.round(numeric);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  return `${hours}h ${String(mins).padStart(2, "0")}m`;
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

function signed(value, unit = "", digits = 0) {
  const numeric = numberValue(value);
  if (numeric === null) return "0";
  const sign = numeric > 0 ? "+" : numeric < 0 ? "-" : "";

  return `${sign}${formatNumber(Math.abs(numeric), digits)}${unit}`;
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

function compactTitle(title) {
  return String(title || "Health signal")
    .replace(" is the main follow-up thread", "")
    .replace("Wearables show ", "")
    .replace(" is visible enough to manage", "")
    .replace(" data is useful but older", " freshness");
}

function buildModel(data) {
  const latest = data.latest || {};
  const series = data.series || {};
  const recovery = latest.recovery_score || {};
  const sleepDuration = latest.sleep_duration || {};
  const sleepPerformance = latest.sleep_performance || {};
  const strain = latest.strain || {};
  const weight = latest.weight || {};
  const sourceCount = 5;
  const snapshotDate = "2026-06-05";
  const readinessScore = 68;
  const recoveryScore = 72;
  const sleepDisplay = "7h 15m";
  const strainDisplay = "2.2";

  return {
    data,
    snapshotDate,
    generatedDay: "5 Jun",
    sourceCount,
    readinessScore,
    recoveryScore,
    sleepDisplay,
    strainDisplay,
    rhr: "49",
    hrv: "62",
    respRate: "13.2",
    weight: formatNumber(weight.value || 65.8, 1),
    sleepPerformance: formatNumber(sleepPerformance.value || 84),
    nutritionScore: 78,
    stressScore: 36,
    protein: "112",
    calories: "1,842",
    hydration: "2.1 / 3 L",
    recoveryDelta: signed(recovery.delta || 6, "%"),
    sleepDelta: signed(sleepDuration.delta || 35, "m"),
    strainDelta: signed(strain.delta || -0.2, "", 1),
    recoveryPath: chartPath(series.recovery_score, "M22 112L88 92L150 104L218 80L288 98L354 76L420 92L498 70"),
    sleepPath: chartPath(series.sleep_duration, "M22 98L88 88L150 92L218 74L288 82L354 66L420 80L498 72"),
    strainSpark: sparkPoints(series.strain, "10,34 38,28 66,32 94,20 122,24 150,16 178,22 210,18"),
    weightSpark: sparkPoints(series.weight, "10,22 38,46 66,26 94,32 122,38 150,40 178,30 210,38")
  };
}

function SourcePill({ label, tone = "green" }) {
  return (
    <button type="button" className="vitals-ai-source-pill">
      <i className={tone} />
      <span>{label}</span>
    </button>
  );
}

function Ring({ value, label, tone = "green", size = 118 }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className={`vitals-ai-ring ${tone}`} style={{ "--ring-size": `${size}px` }}>
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <circle cx="56" cy="56" r={radius} className="track" />
        <circle
          cx="56"
          cy="56"
          r={radius}
          className="value"
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <strong>{value}%</strong>
      {label ? <span>{label}</span> : null}
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

function ScoreBreakdown() {
  const rows = [
    ["Sleep", 72, "green"],
    ["Recovery", 66, "green"],
    ["Strain", 61, "orange"],
    ["Nutrition", 70, "green"]
  ];

  return (
    <div className="vitals-score-breakdown">
      <strong>Score Breakdown</strong>
      {rows.map(([label, value, tone]) => (
        <div key={label}>
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
    <article className="vitals-ai-card vitals-score-card">
      <CardHeading icon={HeartPulse} title="Health Score" />
      <div className="vitals-score-main">
        <div>
          <strong>{model.readinessScore}</strong>
          <span>%</span>
          <small>Good</small>
          <p>+ 8% vs yesterday</p>
        </div>
        <Ring value={model.readinessScore} tone="green" size={116} />
        <ScoreBreakdown />
      </div>
      <footer>Generated {model.generatedDay} 2026 from {model.sourceCount} sources <Info size={13} /></footer>
    </article>
  );
}

function RecoveryCard({ model }) {
  return (
    <article className="vitals-ai-card vitals-recovery-card">
      <CardHeading icon={Droplet} title="Recovery" />
      <div className="vitals-recovery-layout">
        <div>
          <strong>{model.recoveryScore}</strong>
          <span>%</span>
          <small>Improving</small>
          <p>+ 6% vs yesterday</p>
        </div>
        <dl>
          <div><dt>HRV</dt><dd>{model.hrv} ms</dd><em>+ 4 ms</em></div>
          <div><dt>Resting HR</dt><dd>{model.rhr} bpm</dd><em>- 2 bpm</em></div>
          <div><dt>Resp. Rate</dt><dd>{model.respRate} brpm</dd><em>- 0.4</em></div>
        </dl>
      </div>
      <svg className="vitals-ai-line-chart" viewBox="0 0 540 160" aria-hidden="true">
        <line x1="28" x2="512" y1="126" y2="126" />
        <path d={model.recoveryPath} />
        <circle cx="512" cy="70" r="4" />
      </svg>
      <div className="vitals-ai-axis"><span>30 May</span><span>2 Jun</span><span>5 Jun</span></div>
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
    <article className="vitals-ai-card vitals-sleep-card">
      <CardHeading icon={Moon} title="Sleep" />
      <div className="vitals-sleep-top">
        <div>
          <strong>{model.sleepDisplay}</strong>
          <small>Good</small>
          <p>+ 35m vs yesterday</p>
        </div>
        <Ring value={84} label="Quality" tone="blue" size={112} />
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
            <b className={tone} style={{ width: `${width}%` }} key={`${label}-${index}`} />
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

  return (
    <article className="vitals-ai-card vitals-training-card">
      <CardHeading icon={Zap} title="Training Load / Strain" />
      <div className="vitals-training-main">
        <div>
          <strong>{model.strainDisplay}</strong>
          <small>Moderate</small>
          <p>- 0.2 vs yesterday</p>
        </div>
        <div className="vitals-load-chart">
          <span>7-Day Load Trend</span>
          <div>
            {bars.map((bar, index) => (
              <i style={{ height: `${bar}%` }} key={index} />
            ))}
          </div>
          <footer>{["T", "F", "S", "S", "M", "T", "W"].map((day, index) => <em key={`${day}-${index}`}>{day}</em>)}</footer>
        </div>
      </div>
      <div className="vitals-training-stats">
        <div><span>Weekly Load</span><strong>392</strong><small>Optimal</small></div>
        <div><span>Activity Minutes</span><strong>312</strong><small>This week</small></div>
        <div><span>Training Balance</span><strong>0.8</strong><small>Optimal</small></div>
        <Ring value={72} tone="green" size={72} />
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
    <article className="vitals-ai-card vitals-body-metrics-card">
      <CardHeading icon={Activity} title="Body Metrics" action="View trends" />
      <div className="vitals-body-metrics-layout">
        <dl>
          {rows.map(([label, value, delta]) => (
            <div key={label}>
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
    <article className="vitals-ai-card vitals-nutrition-card-v2">
      <CardHeading icon={Droplet} title="Nutrition & Hydration" action="View details" />
      <div className="vitals-nutrition-v2-body">
        <Ring value={model.nutritionScore} label="Nutrition" tone="green" size={96} />
        <div>
          {[
            ["Calories", `${model.calories} / 2,200 kcal`, 82, "green"],
            ["Protein", `${model.protein} / 140 g`, 80, "green"],
            ["Hydration", model.hydration, 72, "blue"]
          ].map(([label, value, width, tone]) => (
            <section key={label}>
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
    <article className="vitals-ai-card vitals-stress-card">
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
    <article className="vitals-ai-card vitals-trends-card">
      <CardHeading title="Trends Summary" action="View all" />
      <div className="vitals-trends-list">
        {rows.map(([label, state, delta, tone]) => (
          <div key={label}>
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

function ReadinessHabitsCard() {
  const rows = ["WHOOP", "Training", "Nutrition", "Sleep", "Mindfulness"];
  const pattern = ["high", "mid", "high", "soft", "high", "none", "watch", "high", "high", "high", "mid", "high", "none", "soft"];

  return (
    <article className="vitals-ai-card vitals-habits-card">
      <div className="vitals-habits-board">
        <header>
          <h2>Daily Readiness & Habits</h2>
          <p>Live readiness and habit adherence</p>
        </header>
        <div className="vitals-habit-days">
          {["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        {rows.map((row, rowIndex) => (
          <div className="vitals-habit-row" key={row}>
            <span>{row}</span>
            {pattern.map((cell, index) => (
              <i className={pattern[(index + rowIndex * 2) % pattern.length]} key={`${row}-${cell}-${index}`} />
            ))}
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
        <strong>68% <span>+ 8%</span></strong>
        <TinyLine points="10,48 42,42 74,38 106,45 138,30 170,36 202,31 232,34" tone="green" />
        <div>
          <span>Best Day <b>Wed, 3 Jun</b></span>
          <span>78%</span>
          <span>Focus Area <b>Late Bedtime</b></span>
        </div>
      </aside>
    </article>
  );
}

function InsightsCard({ model }) {
  const rows = [
    ["Iron handling", "Low ferritin/iron saturation trend continues. Consider reviewing iron intake and sources.", "Clinician", "amber"],
    ["Late bedtimes impacting deep sleep", "You have had 4 late bedtimes this week. Aim for an earlier wind-down routine.", "Lifestyle", "orange"],
    ["Nice work on training balance", "Your aerobic base and strain balance look great. Keep it up!", "Positive", "green"],
    ["Hydration dip on training days", "Hydration was below target on 2 training days this week.", "Monitor", "teal"]
  ];

  return (
    <article className="vitals-ai-card vitals-insights-card">
      <div className="vitals-insights-main">
        <header>
          <div>
            <h2>Health Intelligence & Insights</h2>
            <p>AI-powered insights and actionable recommendations</p>
          </div>
          <button type="button">View all insights <ArrowRight size={14} /></button>
        </header>
        <nav>
          <button type="button" className="active">Top Priorities</button>
          <button type="button">Positive Signals <span>4</span></button>
          <button type="button">Watchlist <span>2</span></button>
          <button type="button">All Insights</button>
        </nav>
        <div className="vitals-insight-list">
          {rows.map(([title, detail, tag, tone], index) => (
            <div key={title}>
              <em>{index + 1}</em>
              <i className={tone}>{tag.slice(0, 1)}</i>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
              <b>{tag}</b>
              <ArrowRight size={15} />
            </div>
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

function BriefStrip() {
  const items = [
    ["Recovery improving", "Your HRV and resting HR are trending in the right direction."],
    ["Sleep on track", "Consistent sleep supporting recovery and performance."],
    ["Keep fueling well", "Protein and hydration look good. Stay consistent."],
    ["Focus for today", "Prioritise an earlier bedtime and mindfully manage stress."]
  ];

  return (
    <article className="vitals-ai-brief">
      <div className="vitals-brief-logo">
        <Activity size={26} />
      </div>
      <div>
        <h2>AI Health Brief</h2>
        <p>Personalised daily summary</p>
      </div>
      {items.map(([title, detail]) => (
        <section key={title}>
          <CheckCircle2 size={20} />
          <span><strong>{title}</strong><small>{detail}</small></span>
        </section>
      ))}
      <button type="button">View Full Brief <ArrowRight size={16} /></button>
    </article>
  );
}

export function VitalsDashboardPreview({ compact = false, dataUrl = remoteVitalsDataUrl }) {
  const [runtimeHealthData, setRuntimeHealthData] = useState(fallbackHealthData);
  const [range, setRange] = useState("7d");
  const [snapshotIndex, setSnapshotIndex] = useState(0);

  useEffect(() => {
    const url = String(dataUrl || "").trim();
    if (!url) return undefined;

    let cancelled = false;

    fetch(url, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.sourceCoverage && data?.latest && data?.series) {
          setRuntimeHealthData(data);
        }
      })
      .catch(() => {});

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
    setSnapshotIndex((current) => Math.max(0, Math.min(3, current - direction)));
  }

  return (
    <section className={`vitals-ai-dashboard ${compact ? "is-compact" : ""}`} aria-label="Vitals dashboard">
      <div className="vitals-ai-shell">
        <section className="vitals-ai-hero">
          <div className="vitals-hero-landscape" style={{ backgroundImage: `url(${bannerImage})` }}>
            <header className="vitals-hero-topbar">
              <div className="vitals-ai-title">
                <h1>Vitals</h1>
                <p>Health Intelligence</p>
              </div>
              <nav className="vitals-ai-sources" aria-label="Connected sources">
                <SourcePill label="WHOOP" tone="green" />
                <SourcePill label="Strava" tone="orange" />
                <SourcePill label="Fitbit" tone="blue" />
                <SourcePill label="Google Fit" tone="red" />
                <button type="button" className="vitals-ai-source-more">+2 more</button>
              </nav>
              <div className="vitals-ai-controls">
                <div className="vitals-ai-date">
                  <button type="button" onClick={() => moveSnapshot(-1)} aria-label="Previous dashboard snapshot"><ChevronLeft size={18} /></button>
                  <span>Snapshot {formatShortDate(rangeEndDate)}</span>
                  <CalendarDays size={17} />
                  <button type="button" onClick={() => moveSnapshot(1)} aria-label="Next dashboard snapshot"><ChevronRight size={18} /></button>
                </div>
                <div className="vitals-ai-ranges" aria-label="Dashboard range">
                  {["7d", "14d", "30d"].map((option) => (
                    <button type="button" className={range === option ? "active" : ""} onClick={() => setRange(option)} key={option}>
                      {option}
                    </button>
                  ))}
                </div>
                <button type="button" className="vitals-ai-bell" aria-label="Notifications"><Bell size={20} /><i /></button>
              </div>
            </header>
            <div className="vitals-hero-metrics">
              <section className="primary">
                <span>Overall Readiness</span>
                <strong>{model.readinessScore}<em>%</em></strong>
                <small>Good <b>+ 8% vs yesterday</b></small>
              </section>
              <section><HeartPulse size={18} /><span>Recovery</span><strong>Improving</strong><small>+ 6%</small></section>
              <section><Moon size={18} /><span>Sleep</span><strong>On Track</strong><small>{model.sleepDisplay}</small></section>
              <section><Activity size={18} /><span>Training Balance</span><strong>Optimal</strong><small>0.8</small></section>
            </div>
          </div>
          <aside className="vitals-quote-card" style={{ backgroundImage: `url(${bannerImage})` }}>
            <span>"</span>
            <p>Small daily choices<br />create big change.</p>
            <em>Keep going!</em>
          </aside>
        </section>

        <section className="vitals-ai-grid">
          <HealthScoreCard model={model} />
          <RecoveryCard model={model} />
          <SleepCard model={model} />
          <TrainingLoadCard model={model} />
          <BodyMetricsCard model={model} />
          <NutritionCard model={model} />
          <StressCard model={model} />
          <TrendsCard />
          <ReadinessHabitsCard />
          <InsightsCard model={model} />
          <BriefStrip />
        </section>
      </div>
    </section>
  );
}
