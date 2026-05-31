import { ArrowRight, Check, Circle, LockKeyhole } from "lucide-react";

const accents = {
  blue: "#245cff",
  green: "#2c8068",
  orange: "#f0782d",
  stone: "#d8d2c7"
};

const overviewMetrics = [
  ["Sleep", "Private", "Latest value hidden"],
  ["Recovery", "Private", "Latest value hidden"],
  ["Training", "Current", "Source freshness view"],
  ["Nutrition", "Current", "Review prompt view"],
  ["Weight", "Private", "Trend hidden"],
  ["Steps", "Private", "Daily value hidden"],
  ["Labs", "Review", "Clinician context"],
  ["Notes", "Queued", "Conversation prompts"]
];

const sourceRows = [
  ["Wearable", "Fresh"],
  ["Training", "Fresh"],
  ["Nutrition", "Review"],
  ["Labs", "Review"]
];

const barHeights = [48, 70, 54, 86, 62, 76, 58];
const signalDots = [
  ["Sleep", ["good", "good", "watch", "good", ""]],
  ["Energy", ["good", "good", "good", "", ""]],
  ["Stress", ["watch", "", "", "", ""]],
  ["Notes", ["good", "good", "good", "watch", ""]]
];

function PublicRing({ label, color }) {
  return (
    <div className="health-ring">
      <svg viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="33" className="health-ring-track" />
        <circle
          cx="46"
          cy="46"
          r="33"
          className="health-ring-value"
          style={{ stroke: color, strokeDasharray: 207, strokeDashoffset: 56 }}
        />
      </svg>
      <strong>--</strong>
      <span>{label}</span>
    </div>
  );
}

function StaticLineChart() {
  return (
    <svg className="health-line-chart" viewBox="0 0 560 220" role="img" aria-label="Private health trend preview">
      {[0, 1, 2, 3].map((tick) => (
        <line
          key={tick}
          x1="0"
          x2="560"
          y1={(220 / 3) * tick}
          y2={(220 / 3) * tick}
          className="health-chart-grid"
        />
      ))}
      <polyline
        points="0,150 70,124 140,138 210,98 280,116 350,72 420,92 490,62 560,84"
        fill="none"
        stroke={accents.green}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[0, 70, 140, 210, 280, 350, 420, 490, 560].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy={[150, 124, 138, 98, 116, 72, 92, 62, 84][index]}
          r={index === 8 ? 6 : 3}
          fill="#ffffff"
          stroke={accents.green}
          strokeWidth={index === 8 ? 3 : 2}
        />
      ))}
    </svg>
  );
}

export function VitalsDashboardPreview({ compact = false }) {
  return (
    <section className={`health-preview ${compact ? "is-compact" : ""}`} aria-label="Vitals Health Dashboard preview">
      {!compact && (
        <header className="page-grid health-preview-hero">
          <h1>Vitals Health Dashboard</h1>
        </header>
      )}

      <section className={compact ? "health-preview-grid" : "page-grid health-preview-grid"}>
        <article className="health-card health-overview-card">
          <header className="health-card-header">
            <div>
              <h2>Signal overview</h2>
              <p>Public-safe dashboard shape with private values hidden.</p>
            </div>
            <strong>
              Private
              <span>values hidden</span>
            </strong>
          </header>
          <div className="health-overview-grid">
            {overviewMetrics.map(([label, value, detail], index) => (
              <div className="health-overview-metric" key={label}>
                <span>{label}</span>
                {index < 2 ? (
                  <PublicRing label={label} color={index === 0 ? accents.blue : accents.green} />
                ) : (
                  <strong>{value}</strong>
                )}
                <small>{detail}</small>
              </div>
            ))}
          </div>
          <footer className="health-card-footer">
            <span>
              <i className="health-dot green" />
              Real data stays local
            </span>
            <span>
              <LockKeyhole size={14} />
              Public preview
            </span>
          </footer>
        </article>

        <article className="health-card health-chart-card">
          <header className="health-card-header">
            <div>
              <h2>Source freshness</h2>
              <p>Latest-source checks, trend shape, and review status.</p>
            </div>
            <span className="health-text-action">
              Review
              <ArrowRight size={14} />
            </span>
          </header>
          <div className="health-bar-chart" aria-label="Public-safe source freshness bars">
            <div className="health-chart-rule" />
            {barHeights.map((height, index) => (
              <div className="health-bar-column" key={`${height}-${index}`}>
                <span style={{ height: `${height}%` }} />
                <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small>
              </div>
            ))}
          </div>
          <footer className="health-card-footer">
            <span>Values are illustrative only</span>
            <span>
              <Circle size={12} />
              Snapshot hidden
            </span>
          </footer>
        </article>

        <article className="health-card health-weight-card">
          <div>
            <h2>Trend surface</h2>
            <strong>
              -- <span>hidden</span>
            </strong>
            <small>Personal values remain outside the public build.</small>
          </div>
          <StaticLineChart />
          <footer className="health-card-footer">
            <span>
              <i className="health-dot blue" />
              Private trend line
            </span>
          </footer>
        </article>

        <article className="health-card health-training-card">
          <header className="health-card-header">
            <div>
              <h2>Source map</h2>
              <p>Connected sources, freshness, and review routing.</p>
            </div>
          </header>
          <div className="health-training-layout">
            <div className="health-donut" style={{ background: `conic-gradient(${accents.green} 0 48%, ${accents.blue} 48% 74%, ${accents.orange} 74% 88%, ${accents.stone} 88% 100%)` }}>
              <strong>4</strong>
              <span>Sources</span>
            </div>
            <div className="health-training-list">
              {sourceRows.map(([label, status], index) => (
                <div key={label}>
                  <span>
                    <i style={{ background: [accents.green, accents.blue, accents.orange, accents.stone][index] }} />
                    {label}
                  </span>
                  <strong>{status}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="health-card health-journal-card">
          <header className="health-card-header">
            <div>
              <h2>Review prompts</h2>
              <p>Source-backed questions for health conversations.</p>
            </div>
            <strong>
              Local
              <span>evidence first</span>
            </strong>
          </header>
          <div className="health-journal-layout">
            <div className="signal-board">
              {signalDots.map(([label, dots]) => (
                <div key={label}>
                  <span>{label}</span>
                  <p>
                    {dots.map((dot, index) => (
                      <i className={dot} key={`${label}-${index}`} />
                    ))}
                  </p>
                </div>
              ))}
            </div>
            <div className="journal-note-card">
              <span>Private note</span>
              <p>Health signals are summarized for review, while raw source rows and personal values stay local.</p>
            </div>
            <div className="journal-tape">
              <p>
                <Check size={13} /> Public page shows the product shape, not private health data.
              </p>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
