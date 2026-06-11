"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import fallbackHealthData from "@/data/public-health-data.json";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";

const remoteVitalsDataUrl = (
  process.env.NEXT_PUBLIC_VITALS_DATA_URL || "https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals"
).trim();

// Same artwork as the Personal-page expanded overlay banner, so the
// standalone page and the embed read as one surface.
const bannerArt = "/project-art/personal/albion-sunburst-banner.webp";

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

function signedText(delta, unit = "", digits = 0) {
  const numeric = numberValue(delta);
  if (numeric === null) return null;
  const sign = numeric > 0 ? "+" : numeric < 0 ? "−" : "±";

  return `${sign}${formatNumber(Math.abs(numeric), digits)}${unit}`;
}

function weekdayLetter(dateISO) {
  const parsed = dateFromISO(dateISO);
  return parsed ? ["S", "M", "T", "W", "T", "F", "S"][parsed.getUTCDay()] : "";
}

function recoveryWord(score) {
  const numeric = numberValue(score);
  if (numeric === null) return "";
  if (numeric >= 67) return "Recovered";
  if (numeric >= 34) return "Adequate";
  return "Run down";
}

function sleepWord(minutes) {
  const numeric = numberValue(minutes);
  if (numeric === null) return "";
  if (numeric >= 420) return "Rested";
  if (numeric >= 360) return "Short";
  return "Underslept";
}

function strainWord(strain) {
  const numeric = numberValue(strain);
  if (numeric === null) return "";
  if (numeric >= 14) return "Heavy day";
  if (numeric >= 8) return "Working";
  if (numeric >= 4) return "Light";
  return "Resting";
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

function axisFor(points, startISO, endISO) {
  if (points.length < 2) return [formatShortDate(startISO), formatShortDate(endISO)];
  const middle = points[Math.floor((points.length - 1) / 2)];

  return points.length > 4
    ? [formatShortDate(points[0].date), formatShortDate(middle.date), formatShortDate(points.at(-1).date)]
    : [formatShortDate(points[0].date), formatShortDate(points.at(-1).date)];
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

function buildView(data, range, snapshotIndex) {
  const latest = data.latest || {};
  const series = data.series || {};
  const days = rangeDays(range);
  const snapshotDate = getVitalsSnapshotDate(data) || isoDate(new Date());
  const endDate = addDays(dateFromISO(snapshotDate) || new Date(), -snapshotIndex * days);
  const endISO = isoDate(endDate);
  const startISO = isoDate(addDays(endDate, -(days - 1)));

  const recovery = windowSeries(series.recovery_score, startISO, endISO);
  const sleep = windowSeries(series.sleep_duration, startISO, endISO);
  const strain = windowSeries(series.strain, startISO, endISO);
  const calories = windowSeries(series.calories_burned, startISO, endISO);
  const workout = windowSeries(series.workout, startISO, endISO);

  const recoveryLast = lastWithDelta(series.recovery_score, recovery);
  const sleepLast = lastWithDelta(series.sleep_duration, sleep);
  const strainLast = lastWithDelta(series.strain, strain);
  const caloriesLast = lastWithDelta(series.calories_burned, calories);

  const weightSeries = cleanSeries(series.weight);
  const stepsSeries = cleanSeries(series.steps);
  const averages = latest.whoopAverages || {};

  return {
    startISO,
    endISO,
    windowLabel: `${formatShortDate(startISO)} – ${formatShortDate(endISO)}`,
    headlineReadiness: numberValue(latest.recovery_score?.value),
    generatedDay: formatShortDate(String(data.generatedAt || snapshotDate).slice(0, 10)),
    sources: Array.isArray(data.sourceCoverage) ? data.sourceCoverage : [],

    recovery,
    recoveryLast,
    recoveryAvg: averageOf(recovery),
    recoveryAxis: axisFor(recovery, startISO, endISO),

    hrv: latest.hrv || null,
    rhr: latest.heart_rate_resting || null,
    sleepPerformance: latest.sleep_performance || null,
    hrvAvg7d: numberValue(averages.hrv7d),
    rhrAvg7d: numberValue(averages.rhr7d),

    sleep,
    sleepLast,
    sleepAvg: averageOf(sleep),

    strain,
    strainLast,
    strainLoad: strain.length ? sumOf(strain) : null,
    workoutMinutes: workout.length ? sumOf(workout) : null,
    workoutDays: workout.length,

    calories,
    caloriesLast,
    caloriesAvg: averageOf(calories),
    caloriesAxis: axisFor(calories, startISO, endISO),

    weight: latest.weight || null,
    weightSeries,
    stepsSeries,
    stepsLast: stepsSeries.at(-1) || null,
    stepsAvg: averageOf(stepsSeries.slice(-7)),
    nutrition: data.nutrition?.latest || null
  };
}

function Delta({ value, unit = "", digits = 0, suffix = "vs previous" }) {
  const text = signedText(value, unit, digits);
  if (text === null) return null;

  const tone = Number(value) > 0 ? "is-up" : Number(value) < 0 ? "is-down" : "";
  return (
    <span className={`vitals-delta ${tone}`}>
      {text} {suffix}
    </span>
  );
}

function EmptyWindow({ view }) {
  return <p className="vitals-empty">No readings between {view.windowLabel}.</p>;
}

function LineChart({ points, guide, guideLabel, axis, unit = "", digits = 0, formatValue }) {
  const width = 600;
  const height = 180;
  const pad = { top: 18, right: 14, bottom: 10, left: 14 };

  if (points.length < 2) return null;

  const values = points.map((point) => numberValue(point.value));
  const guideValue = numberValue(guide);
  const min = Math.min(...values, ...(guideValue === null ? [] : [guideValue]));
  const max = Math.max(...values, ...(guideValue === null ? [] : [guideValue]));
  const span = max - min || 1;
  const x = (index) => pad.left + (index / (points.length - 1)) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - ((value - min) / span) * (height - pad.top - pad.bottom);
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join("");
  const area = `${path}L${x(values.length - 1).toFixed(1)} ${height}L${x(0).toFixed(1)} ${height}Z`;
  const describe = (point) =>
    `${formatShortDate(point.date)}: ${formatValue ? formatValue(point.value) : `${formatNumber(point.value, digits)}${unit}`}`;

  return (
    <figure className="vitals-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={points.map(describe).join("; ")}>
        <path className="vitals-chart-area" d={area} />
        {guideValue !== null ? (
          <line className="vitals-chart-guide" x1={pad.left} x2={width - pad.right} y1={y(guideValue)} y2={y(guideValue)} />
        ) : null}
        <path className="vitals-chart-line" d={path} pathLength="1" />
        {points.map((point, index) => (
          <circle
            className={`vitals-chart-dot ${index === points.length - 1 ? "is-last" : ""}`}
            cx={x(index)}
            cy={y(values[index])}
            r={index === points.length - 1 ? 4.5 : 7}
            key={point.date}
          >
            <title>{describe(point)}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="vitals-chart-axis">
        {axis.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
        {guideValue !== null && guideLabel ? <em>{guideLabel}</em> : null}
      </figcaption>
    </figure>
  );
}

function DayBars({ points, max, guide, formatValue, dense = false }) {
  if (!points.length) return null;

  const top = Math.max(...points.map((point) => numberValue(point.value)), max || 0) || 1;
  const guideValue = numberValue(guide);

  return (
    <div className={`vitals-bars ${dense ? "is-dense" : ""}`}>
      <div className="vitals-bars-track">
        {guideValue !== null ? (
          <span className="vitals-bars-guide" style={{ bottom: `${(guideValue / top) * 100}%` }} aria-hidden="true" />
        ) : null}
        {points.map((point, index) => {
          const value = numberValue(point.value);
          const label = `${formatShortDate(point.date)}: ${formatValue(value)}`;

          return (
            <i
              style={{
                "--bar-height": `${Math.max((value / top) * 100, 1.5)}%`,
                "--bar-delay": `${index * 26}ms`
              }}
              title={label}
              aria-label={label}
              role="img"
              key={point.date}
            />
          );
        })}
      </div>
      <div className="vitals-bars-days" aria-hidden="true">
        {points.map((point, index) => (
          <em key={point.date}>{!dense || index % 2 === 0 ? weekdayLetter(point.date) : ""}</em>
        ))}
      </div>
    </div>
  );
}

function Spark({ points, formatValue }) {
  const sample = points.slice(-24);
  if (sample.length < 2) return null;

  const width = 200;
  const height = 56;
  const pad = 6;
  const values = sample.map((point) => numberValue(point.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values
    .map((value, index) => {
      const x = pad + (index / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const label = `${formatShortDate(sample[0].date)} to ${formatShortDate(sample.at(-1).date)}, ${formatValue(values[0])} to ${formatValue(values.at(-1))}`;

  return (
    <svg className="vitals-spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <title>{label}</title>
      <polyline points={coords} pathLength="1" />
    </svg>
  );
}

function RecoveryLede({ view }) {
  const last = view.recoveryLast;

  return (
    <article className="vitals-panel vitals-lede" data-card-metric="recovery">
      <header className="vitals-panel-head">
        <h2>Recovery</h2>
        <span className="vitals-source-note">whoop {last ? `· ${formatShortDate(last.date)}` : ""}</span>
      </header>

      {last ? (
        <div className="vitals-lede-body">
          <div className="vitals-lede-reading">
            <p className="vitals-figure">
              {formatNumber(last.value)}
              <small>%</small>
            </p>
            <p className="vitals-status">
              <i data-tone={last.value >= 67 ? "good" : last.value >= 34 ? "mid" : "low"} aria-hidden="true" />
              {recoveryWord(last.value)}
            </p>
            <p className="vitals-reading-meta">
              <Delta value={last.delta} unit="" digits={0} suffix="vs previous night" />
              {view.recoveryAvg !== null ? <span>{formatNumber(view.recoveryAvg)}% average over {view.recovery.length} readings</span> : null}
            </p>

            <dl className="vitals-pulse-list">
              {view.hrv ? (
                <div>
                  <dt>Heart rate variability</dt>
                  <dd>
                    {formatNumber(view.hrv.value, 1)} ms
                    <Delta value={view.hrv.delta} unit=" ms" digits={1} suffix="" />
                  </dd>
                  <em>{formatShortDate(view.hrv.date)}{view.hrvAvg7d !== null ? ` · 7-day ${formatNumber(view.hrvAvg7d, 1)} ms` : ""}</em>
                </div>
              ) : null}
              {view.rhr ? (
                <div>
                  <dt>Resting heart rate</dt>
                  <dd>
                    {formatNumber(view.rhr.value)} bpm
                    <Delta value={view.rhr.delta} unit=" bpm" suffix="" />
                  </dd>
                  <em>{formatShortDate(view.rhr.date)}{view.rhrAvg7d !== null ? ` · 7-day ${formatNumber(view.rhrAvg7d)} bpm` : ""}</em>
                </div>
              ) : null}
              {view.sleepPerformance ? (
                <div>
                  <dt>Sleep performance</dt>
                  <dd>
                    {formatNumber(view.sleepPerformance.value)}%
                    <Delta value={view.sleepPerformance.delta} unit="%" suffix="" />
                  </dd>
                  <em>{formatShortDate(view.sleepPerformance.date)}</em>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="vitals-lede-chart">
            <LineChart
              points={view.recovery}
              guide={view.recoveryAvg}
              guideLabel={`window average ${formatNumber(view.recoveryAvg)}%`}
              axis={view.recoveryAxis}
              unit="%"
            />
          </div>
        </div>
      ) : (
        <EmptyWindow view={view} />
      )}
    </article>
  );
}

function SleepPanel({ view }) {
  const last = view.sleepLast;

  return (
    <article className="vitals-panel" data-card-metric="sleep">
      <header className="vitals-panel-head">
        <h2>Sleep</h2>
        <span className="vitals-source-note">whoop {last ? `· ${formatShortDate(last.date)}` : ""}</span>
      </header>

      {last ? (
        <>
          <p className="vitals-figure">{formatDuration(last.value)}</p>
          <p className="vitals-status">
            <i data-tone={last.value >= 420 ? "good" : last.value >= 360 ? "mid" : "low"} aria-hidden="true" />
            {sleepWord(last.value)}
          </p>
          <p className="vitals-reading-meta">
            <Delta value={last.delta} unit="m" suffix="vs previous night" />
            {view.sleepAvg !== null ? <span>{formatDuration(view.sleepAvg)} average over {view.sleep.length} nights</span> : null}
          </p>
          <DayBars
            points={view.sleep}
            max={480}
            guide={420}
            formatValue={(value) => formatDuration(value)}
            dense={view.sleep.length > 16}
          />
          <p className="vitals-guide-note">guide line marks 7 hours</p>
        </>
      ) : (
        <EmptyWindow view={view} />
      )}
    </article>
  );
}

function StrainPanel({ view }) {
  const last = view.strainLast;

  return (
    <article className="vitals-panel" data-card-metric="strain">
      <header className="vitals-panel-head">
        <h2>Strain</h2>
        <span className="vitals-source-note">whoop {last ? `· ${formatShortDate(last.date)}` : ""}</span>
      </header>

      {last ? (
        <>
          <p className="vitals-figure">{formatNumber(last.value, 1)}</p>
          <p className="vitals-status">
            <i data-tone={last.value >= 14 ? "low" : last.value >= 4 ? "mid" : "good"} aria-hidden="true" />
            {strainWord(last.value)}
          </p>
          <p className="vitals-reading-meta">
            <Delta value={last.delta} digits={1} suffix="vs previous day" />
            {view.strainLoad !== null ? <span>{formatNumber(view.strainLoad)} load over {view.strain.length} days</span> : null}
            {view.workoutMinutes !== null ? (
              <span>
                {formatDuration(view.workoutMinutes)} in workouts across {view.workoutDays} {view.workoutDays === 1 ? "day" : "days"}
              </span>
            ) : null}
          </p>
          <DayBars
            points={view.strain}
            max={21}
            formatValue={(value) => `${formatNumber(value, 1)} strain`}
            dense={view.strain.length > 16}
          />
          <p className="vitals-guide-note">whoop strain scale runs 0 to 21</p>
        </>
      ) : (
        <EmptyWindow view={view} />
      )}
    </article>
  );
}

function EnergyPanel({ view }) {
  const last = view.caloriesLast;

  return (
    <article className="vitals-panel vitals-energy" data-card-metric="energy">
      <header className="vitals-panel-head">
        <h2>Energy burned</h2>
        <span className="vitals-source-note">whoop {last ? `· ${formatShortDate(last.date)}` : ""}</span>
      </header>

      {last ? (
        <div className="vitals-energy-body">
          <div>
            <p className="vitals-figure">
              {formatNumber(last.value)}
              <small>kcal</small>
            </p>
            <p className="vitals-reading-meta">
              <Delta value={last.delta} unit=" kcal" suffix="vs previous day" />
              {view.caloriesAvg !== null ? <span>{formatNumber(view.caloriesAvg)} kcal daily average this window</span> : null}
            </p>
          </div>
          <LineChart
            points={view.calories}
            guide={view.caloriesAvg}
            guideLabel={`average ${formatNumber(view.caloriesAvg)} kcal`}
            axis={view.caloriesAxis}
            formatValue={(value) => `${formatNumber(value)} kcal`}
          />
        </div>
      ) : (
        <EmptyWindow view={view} />
      )}
    </article>
  );
}

function ArchivePanel({ view }) {
  const weightPoints = view.weightSeries;
  const stepsPoints = view.stepsSeries;
  const nutrition = view.nutrition;
  const nutritionRows = nutrition
    ? [
        ["Energy", nutrition.kcal_7d, "kcal"],
        ["Protein", nutrition.protein_7d, "g"],
        ["Fat", nutrition.fat_7d, "g"],
        ["Net carbs", nutrition.netcarb_7d, "g"],
        ["Fiber", nutrition.fiber_7d, "g"],
        ["Sugar", nutrition.sugar_7d, "g"]
      ].filter(([, value]) => numberValue(value) !== null)
    : [];

  if (!view.weight && !weightPoints.length && !stepsPoints.length && !nutritionRows.length) return null;

  return (
    <article className="vitals-panel vitals-archive" data-card-metric="archive">
      <header className="vitals-panel-head">
        <h2>Dormant signals</h2>
        <span className="vitals-source-note">sources that have stopped reporting — shown with their last dates</span>
      </header>

      <div className="vitals-archive-grid">
        {view.weight ? (
          <section>
            <h3>Body weight</h3>
            <p className="vitals-archive-figure">
              {formatNumber(view.weight.value, 1)} kg
              <Delta value={view.weight.delta} unit=" kg" digits={1} suffix="" />
            </p>
            <em>last measured {formatShortDate(view.weight.date)}</em>
            {weightPoints.length > 1 ? (
              <>
                <Spark points={weightPoints} formatValue={(value) => `${formatNumber(value, 1)} kg`} />
                <em>
                  daily series {formatShortDate(weightPoints[0].date)} – {formatShortDate(weightPoints.at(-1).date)}
                </em>
              </>
            ) : null}
          </section>
        ) : null}

        {view.stepsLast ? (
          <section>
            <h3>Steps</h3>
            <p className="vitals-archive-figure">{formatNumber(view.stepsLast.value)}</p>
            <em>last counted {formatShortDate(view.stepsLast.date)}{view.stepsAvg !== null ? ` · final week averaged ${formatNumber(view.stepsAvg)}` : ""}</em>
            {stepsPoints.length > 1 ? (
              <>
                <Spark points={stepsPoints} formatValue={(value) => `${formatNumber(value)} steps`} />
                <em>
                  daily series {formatShortDate(stepsPoints[0].date)} – {formatShortDate(stepsPoints.at(-1).date)}
                </em>
              </>
            ) : null}
          </section>
        ) : null}

        {nutritionRows.length ? (
          <section className="vitals-archive-nutrition">
            <h3>Nutrition</h3>
            <em>7-day averages to {formatShortDate(nutrition.date)}</em>
            <dl>
              {nutritionRows.map(([label, value, unit]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {formatNumber(value, unit === "kcal" ? 0 : 1)} {unit}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function SourcesFooter({ view }) {
  if (!view.sources.length) return null;

  return (
    <footer className="vitals-sources" aria-label="Data sources">
      <h2>Sources</h2>
      <ul>
        {view.sources.map((source) => (
          <li key={source.source}>
            <i data-live={source.latestDay >= view.startISO ? "true" : "false"} aria-hidden="true" />
            <strong>{source.source}</strong>
            <span>
              {formatNumber(source.rows)} rows · {source.metricCount} metrics · {formatShortDate(source.firstDay)} – {formatShortDate(source.latestDay)}
            </span>
          </li>
        ))}
      </ul>
      <p>Compiled {view.generatedDay} from the Vitals refresh worker.</p>
    </footer>
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

  const view = useMemo(
    () => buildView(runtimeHealthData, range, snapshotIndex),
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
              {view.headlineReadiness !== null ? (
                <p className="vitals-banner-stat">
                  <strong>{formatNumber(view.headlineReadiness)}%</strong>
                  <small>overall readiness</small>
                </p>
              ) : null}
              <div className="vitals-ai-date">
                <button type="button" onClick={() => moveSnapshot(-1)} aria-label="Previous dashboard snapshot">
                  <ChevronLeft size={17} />
                </button>
                <span>{view.windowLabel}</span>
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

        <div className="vitals-board" key={view.windowLabel}>
          <RecoveryLede view={view} />
          <div className="vitals-pair">
            <SleepPanel view={view} />
            <StrainPanel view={view} />
          </div>
          <EnergyPanel view={view} />
          <ArchivePanel view={view} />
          <SourcesFooter view={view} />
        </div>
      </div>
    </section>
  );
}
