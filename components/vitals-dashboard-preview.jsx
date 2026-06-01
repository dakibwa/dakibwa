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
  LockKeyhole,
  Moon,
  Plus,
  Thermometer,
  Upload,
  X,
} from "lucide-react";

const tones = {
  green: "#208768",
  teal: "#0b6874",
  orange: "#e7902f",
  coral: "#e46f43",
  ink: "#081216"
};

const snapshots = [
  {
    label: "Latest local snapshot",
    caption: "Private values hidden",
    recency: "Current view",
    summary: "A masked view of the newest local Vitals export."
  },
  {
    label: "Previous review window",
    caption: "Trend shape only",
    recency: "Earlier view",
    summary: "A public-safe comparison state for checking interface behavior."
  },
  {
    label: "Source audit view",
    caption: "Freshness first",
    recency: "Audit view",
    summary: "A source-led state for confirming where review attention goes."
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
    value: "Private",
    unit: "",
    status: "Local only",
    trend: "Multi-source rollup",
    tone: "green",
    ring: 72
  },
  {
    key: "recovery",
    label: "Recovery",
    value: "Connected",
    unit: "",
    status: "Wearable source",
    trend: "Latest value masked",
    tone: "orange",
    ring: 64
  },
  {
    key: "sleep",
    label: "Sleep",
    value: "--",
    unit: "h -- m",
    status: "Tracked",
    trend: "Duration + quality",
    tone: "teal",
    spark: "80,52 96,42 112,49 128,35 144,43 160,38 176,55 192,47 208,62"
  },
  {
    key: "strain",
    label: "Strain",
    value: "--",
    unit: "load",
    status: "Training",
    trend: "Load view available",
    tone: "teal",
    spark: "80,39 96,34 112,38 128,36 144,44 160,47 176,54 192,52 208,58"
  }
];

const miniMetrics = [
  { key: "review", label: "Resting Heart Rate", value: "Private", detail: "Low-pulse review item", icon: HeartPulse, tone: "green" },
  { key: "sources", label: "HRV", value: "Private", detail: "Wearable trend source", icon: Activity, tone: "teal" },
  { key: "sources", label: "Body Temperature", value: "Private", detail: "No public value", icon: Thermometer, tone: "coral" },
  { key: "sources", label: "Blood Oxygen", value: "Private", detail: "Private source row", icon: Droplet, tone: "teal" }
];

const sourceRows = [
  ["Wearable", "Connected", tones.green],
  ["Training", "Connected", tones.teal],
  ["Nutrition", "Older", tones.orange],
  ["Labs", "Review", tones.coral],
  ["Journal", "Queued", "#a8b6bd"]
];

const readinessRows = [
  ["Wearable", ["high", "mid", "mid", "high", "high", "", "mid"]],
  ["Training", ["mid", "mid", "high", "high", "watch", "", "mid"]],
  ["Nutrition", ["high", "mid", "", "mid", "mid", "watch", ""]],
  ["Labs", ["mid", "high", "high", "mid", "", "", ""]]
];

const reviewRows = [
  ["Iron handling", "Clinician", "Review thread"],
  ["Low resting pulse", "Monitor", "Wearable + lab context"],
  ["Sleep consistency", "Trend", "Manageable signal"],
  ["Nutrition freshness", "Freshness", "Older window"]
];

const labRows = [
  ["Bloodwork", "Private", "Latest verified panel"],
  ["Iron markers", "Review", "Clinician context"],
  ["Inflammation", "Private", "Source-backed"],
  ["Body comp", "Private", "Local trend"],
  ["Notes", "Queued", "Review prompt"]
];

const barValues = [72, 58, 74, 73, 56, 75, 62];

const panels = {
  review: {
    title: "Review Queue",
    kicker: "Public-safe workflow",
    body: "Review prompts are grouped by clinical usefulness, freshness, and source confidence. The public version shows the workflow without the underlying values.",
    rows: ["Iron handling stays a clinician-review prompt.", "Low resting pulse is kept as a source-backed monitoring item.", "Nutrition freshness is visible without showing macros."]
  },
  sources: {
    title: "Source Freshness",
    kicker: "Local connections",
    body: "The live page can show connection health and routing while the raw exports stay ignored from git.",
    rows: ["Wearable, training, nutrition, labs, and journal sources are separated.", "Freshness is visible as status only.", "Raw source rows remain outside the public repository."]
  },
  labs: {
    title: "Labs Summary",
    kicker: "Values masked",
    body: "Lab sections preserve the layout and review prompts, but the public site only publishes labels and status categories.",
    rows: ["Latest panel is represented as a masked source group.", "Review markers explain why a clinician conversation may be useful.", "No public lab values are shipped."]
  },
  activity: {
    title: "Quick Actions",
    kicker: "Prototype controls",
    body: "Actions demonstrate the intended dashboard flow without uploading records or storing personal data on the public site.",
    rows: ["Log Symptom opens a safe metadata flow.", "Add Measure is local-only in the private app.", "Share Report is shown as a review workflow, not a public export."]
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
      <TinySparkline
        points="18,57 38,61 58,50 78,54 98,49 118,58 138,52 158,55 178,45 198,53 218,47"
        color={tones[metric.tone]}
      />
    </article>
  );
}

function ReadinessCard({ focus }) {
  return (
    <article className={`vitals-card vitals-readiness-card${focusClass(focus, "readiness")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Daily Readiness</h2>
          <p>Public-safe source signal board</p>
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
          <p>Connections stay local; public page shows routing only</p>
        </div>
        <button type="button" onClick={onOpen}>Details <ArrowRight size={14} /></button>
      </header>
      <div className="vitals-source-layout">
        <div className="vitals-source-ring">
          <strong>Local</strong>
          <span>data stays private</span>
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
          <h2>Heart Rate</h2>
          <p>Trend shape, values hidden</p>
        </div>
        <button type="button" onClick={onRangeClick}>{range} <ChevronDown size={14} /></button>
      </header>
      <div className="vitals-chart-legend">
        <span><i className="green" /> Resting</span>
        <span><i className="teal" /> Daily average</span>
      </div>
      <svg className="vitals-trend-chart" viewBox="0 0 620 260" role="img" aria-label="Private heart-rate trend shape">
        {[40, 92, 144, 196].map((y) => (
          <line key={y} x1="18" x2="598" y1={y} y2={y} />
        ))}
        <path d="M22 168C76 154 110 160 148 162C196 166 236 160 284 164C334 168 374 154 420 150C470 145 520 160 596 156" className="green" />
        <path d="M22 110C82 88 128 96 174 104C228 112 272 96 318 104C372 112 410 84 462 86C516 88 548 108 596 102" className="teal" />
      </svg>
    </article>
  );
}

function NutritionCard({ focus }) {
  return (
    <article className={`vitals-card vitals-nutrition-card${focusClass(focus, "sources")}`}>
      <header className="vitals-card-heading">
        <div>
          <h2>Nutrition Adherence</h2>
          <p>Logged data window is available but older</p>
        </div>
        <Info size={14} />
      </header>
      <strong>Review<span>freshness</span></strong>
      <small>Private macros are not published.</small>
      <div className="vitals-bars" aria-label="Nutrition adherence bars">
        {barValues.map((value, index) => (
          <span style={{ "--height": `${value}%` }} key={`${value}-${index}`}>
            <i />
            <em>{["M", "T", "W", "T", "F", "S", "S"][index]}</em>
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
          <h2>Labs Summary</h2>
          <p>Latest verified records stay local</p>
        </div>
        <button type="button" onClick={onOpen}>View all labs <ArrowRight size={15} /></button>
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
        Public page preserves the dashboard shape without exposing lab values.
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
            <small>Iron handling, pulse, and source freshness</small>
          </span>
          <button type="button" onClick={onOpenReview}>Open note</button>
        </div>
        <div>
          <CalendarDays size={20} />
          <span>
            <strong>Local snapshot generated</strong>
            <small>Ignored from the public repository</small>
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
    [ClipboardList, "Log Symptom", "activity"],
    [Plus, "Add Measure", "activity"],
    [Upload, "Upload Record", "sources"],
    [FileText, "Share Report", "review"]
  ];

  return (
    <article className={`vitals-card vitals-actions-card${focusClass(focus, "activity")}`} id="vitals-actions">
      <header className="vitals-card-heading">
        <div>
          <h2>Quick Actions</h2>
          <p>Prototype controls</p>
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
              ? `${snapshot.recency} · ${range}`
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
            <div className="vitals-avatar" aria-label="Private profile">
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
          <LockKeyhole size={15} />
          Private health values, generated snapshots, and raw source rows stay outside the public website repository.
        </footer>
      </div>
    </section>
  );
}
