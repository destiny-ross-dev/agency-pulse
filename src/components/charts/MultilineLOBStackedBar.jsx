import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumberShort } from "../../lib/formatHelpers";

const LOB_COLORS = {
  Auto: "#2563eb",
  Fire: "#f97316",
  Life: "#22c55e",
  Health: "#7c3aed",
};

function formatPct(value) {
  const pctValue = Number(value) * 100;
  if (!Number.isFinite(pctValue)) return "0%";
  return `${pctValue.toFixed(1)}%`;
}

function granularityLabel(granularity) {
  if (granularity === "day") return "Daily";
  if (granularity === "week") return "Weekly";
  return "Monthly";
}

function MultilineLOBTooltip({ active, payload, label, lobs, mode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">Multiline LOB Mix</div>
      <div className="tooltip-label">{label}</div>
      {lobs.map((lob) => {
        const count = Number(row[lob]) || 0;
        const pctValue = row[`${lob}Pct`];
        return (
          <div key={lob} className="tooltip-value">
            {lob}:{" "}
            {mode === "percent"
              ? `${formatPct(pctValue)} (${count.toLocaleString()})`
              : count.toLocaleString()}
          </div>
        );
      })}
      <div className="tooltip-value">
        Total: {(Number(row.total) || 0).toLocaleString()}
      </div>
    </div>
  );
}

export default function MultilineLOBStackedBar({
  series,
  height = 260,
  title = "Multiline Lines of Business Mix",
  subtitle,
  emptyMessage = "Not enough multiline data to show a mix over time.",
}) {
  const [mode, setMode] = useState("count");
  const buckets = useMemo(() => series?.buckets || [], [series]);
  const lobs = useMemo(() => series?.lobs || [], [series]);
  const granularity = series?.granularity || "month";

  const totalCount = useMemo(
    () => buckets.reduce((sum, bucket) => sum + (bucket.total || 0), 0),
    [buckets]
  );
  const isEmpty = buckets.length === 0 || totalCount === 0 || lobs.length === 0;

  const resolvedSubtitle =
    subtitle ||
    `Share of multiline opportunities by LOB (${granularityLabel(
      granularity
    )} view).`;

  if (isEmpty) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  return (
    <div
      className="stacked-area"
      aria-label="Multiline lines of business mix chart"
      role="img"
    >
      <div className="stacked-area-header">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">{resolvedSubtitle}</div>
        </div>
        <div className="seg seg-scroll">
          <button
            type="button"
            className={mode === "count" ? "active" : ""}
            onClick={() => setMode("count")}
          >
            Volume
          </button>
          <button
            type="button"
            className={mode === "percent" ? "active" : ""}
            onClick={() => setMode("percent")}
          >
            Mix
          </button>
        </div>
      </div>
      <div className="stacked-area-canvas">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={buckets}
            margin={{ top: 8, right: 16, left: 0, bottom: 12 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
            <XAxis
              dataKey="bucket"
              interval={0}
              tick={{ fontSize: 11, fill: "#64748b" }}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={mode === "percent" ? formatPct : formatNumberShort}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={64}
              allowDecimals={mode === "percent"}
              domain={mode === "percent" ? [0, 1] : ["auto", "auto"]}
            />
            <Tooltip
              content={
                <MultilineLOBTooltip lobs={lobs} mode={mode} />
              }
            />
            {lobs.map((lob) => (
              <Bar
                key={`${lob}-${mode}`}
                dataKey={mode === "percent" ? `${lob}Pct` : lob}
                name={lob}
                stackId="lob"
                fill={LOB_COLORS[lob] || "#0ea5e9"}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="stacked-area-legend">
        {lobs.map((lob) => (
          <span key={lob} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: LOB_COLORS[lob] || "#0ea5e9" }}
            />
            {lob}
          </span>
        ))}
      </div>
    </div>
  );
}
