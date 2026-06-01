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
} from "lucide-react";

const tones = {
  green: "#208768",
  teal: "#0b6874",
  orange: "#e7902f",
  coral: "#e46f43",
  ink: "#081216"
};

const topStats = [
  {
    label: "Health Score",
    value: "Private",
    unit: "",
    status: "Local only",
    trend: "Multi-source rollup",
    tone: "green",
    ring: 72
  },
  {
    label: "Recovery",
    value: "Connected",
    unit: "",
    status: "Wearable source",
    trend: "Latest value masked",
    tone: "orange",
    ring: 64
  },
  {
    label: "Sleep",
    value: "--",
    unit: "h -- m",
    status: "Tracked",
    trend: "Duration + quality",
    tone: "teal",
    spark: "80,52 96,42 112,49 128,35 144,43 160,38 176,55 192,47 208,62"
  },
  {
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
  { label: "Resting Heart Rate", value: "Private", detail: "Low-pulse review item", icon: HeartPulse, tone: "green" },
  { label: "HRV", value: "Private", detail: "Wearable trend source", icon: Activity, tone: "teal" },
  { label: "Body Temperature", value: "Private", detail: "No public value", icon: Thermometer, tone: "coral" },
  { label: "Blood Oxygen", value: "Private", detail: "Private source row", icon: Droplet, tone: "teal" }
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

function StatCard({ stat }) {
  const color = tones[stat.tone] || tones.green;

  return (
    <article className="vitals-card vitals-stat-card">
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

function MiniMetric({ metric }) {
  const Icon = metric.icon;

  return (
    <article className="vitals-card vitals-mini-card">
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

function ReadinessCard() {
  return (
    <article className="vitals-card vitals-readiness-card">
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

function SourceCard() {
  return (
    <article className="vitals-card vitals-source-card">
      <header className="vitals-card-heading">
        <div>
          <h2>Source Freshness</h2>
          <p>Connections stay local; public page shows routing only</p>
        </div>
        <strong>5<span>sources</span></strong>
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

function TrendCard() {
  return (
    <article className="vitals-card vitals-line-card">
      <header className="vitals-card-heading">
        <div>
          <h2>Heart Rate</h2>
          <p>Trend shape, values hidden</p>
        </div>
        <button type="button">7 days <ChevronDown size={14} /></button>
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

function NutritionCard() {
  return (
    <article className="vitals-card vitals-nutrition-card">
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

function ReviewCard() {
  return (
    <article className="vitals-card vitals-review-card">
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
      <a href="#vitals-labs">
        View source map
        <ArrowRight size={15} />
      </a>
    </article>
  );
}

function LabsCard() {
  return (
    <article className="vitals-card vitals-labs-card" id="vitals-labs">
      <header className="vitals-card-heading">
        <div>
          <h2>Labs Summary</h2>
          <p>Latest verified records stay local</p>
        </div>
        <a href="#vitals-labs">View all labs <ArrowRight size={15} /></a>
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

function RecentCard() {
  return (
    <article className="vitals-card vitals-recent-card">
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
          <button type="button">Open note</button>
        </div>
        <div>
          <CalendarDays size={20} />
          <span>
            <strong>Local snapshot generated</strong>
            <small>Ignored from the public repository</small>
          </span>
          <button type="button">Review</button>
        </div>
      </div>
      <a href="#vitals-actions">View all actions <ArrowRight size={15} /></a>
    </article>
  );
}

function ActionsCard() {
  const actions = [
    [ClipboardList, "Log Symptom"],
    [Plus, "Add Measure"],
    [Upload, "Upload Record"],
    [FileText, "Share Report"]
  ];

  return (
    <article className="vitals-card vitals-actions-card" id="vitals-actions">
      <header className="vitals-card-heading">
        <div>
          <h2>Quick Actions</h2>
          <p>Prototype controls</p>
        </div>
      </header>
      <div>
        {actions.map(([Icon, label]) => (
          <button type="button" key={label}>
            <Icon size={20} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function VitalsDashboardPreview({ compact = false }) {
  return (
    <section className={`vitals-dashboard ${compact ? "is-compact" : ""}`} aria-label="Vitals dashboard">
      <div className="vitals-shell">
        <header className="vitals-topbar">
          <h1>Health Overview</h1>
          <div className="vitals-header-actions">
            <div className="vitals-date-control" aria-label="Dashboard date range">
              <ChevronLeft size={18} />
              <span>Latest local snapshot</span>
              <CalendarDays size={16} />
              <ChevronRight size={18} />
            </div>
            <button type="button" className="vitals-week-control">
              Week
              <ChevronDown size={15} />
            </button>
            <button type="button" className="vitals-icon-button" aria-label="Notifications">
              <Bell size={20} strokeWidth={1.7} />
            </button>
            <div className="vitals-avatar" aria-label="Private profile">
              VT
            </div>
          </div>
        </header>

        <section className="vitals-dashboard-grid">
          {topStats.map((stat) => (
            <StatCard stat={stat} key={stat.label} />
          ))}
          <ReadinessCard />

          {miniMetrics.map((metric) => (
            <MiniMetric metric={metric} key={metric.label} />
          ))}
          <ReviewCard />

          <TrendCard />
          <SourceCard />
          <NutritionCard />

          <LabsCard />
          <RecentCard />
          <ActionsCard />
        </section>

        <footer className="vitals-privacy-note">
          <LockKeyhole size={15} />
          Private health values, generated snapshots, and raw source rows stay outside the public website repository.
        </footer>
      </div>
    </section>
  );
}
