import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumberShort } from "../../lib/formatHelpers";

const STAGES = [
  { key: "dials", label: "Dials", color: "#2563eb" },
  { key: "contacts", label: "Contacts", color: "#0ea5e9" },
  { key: "householdsQuoted", label: "Households Quoted", color: "#f59e0b" },
  { key: "sales", label: "Sales", color: "#22c55e" },
];

function ActivityFunnelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const payloadMap = new Map(payload.map((item) => [item.dataKey, item]));

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">Activity Funnel</div>
      <div className="tooltip-label">{label}</div>
      {STAGES.map((stage) => {
        const entry = payloadMap.get(stage.key);
        const value = Number(entry?.value) || 0;
        return (
          <div key={stage.key} className="tooltip-value">
            {stage.label}: {value.toLocaleString()}
          </div>
        );
      })}
    </div>
  );
}

function granularityLabel(granularity) {
  if (granularity === "day") return "Daily";
  if (granularity === "week") return "Weekly";
  return "Monthly";
}

export default function ActivityFunnelChart({
  series,
  height = 260,
  title = "Activity Funnel",
  subtitle,
  emptyMessage = "No activity data available for this agent.",
}) {
  const buckets = useMemo(() => series?.buckets || [], [series]);
  const granularity = series?.granularity || "month";
  const isEmpty = buckets.length === 0;
  const resolvedSubtitle =
    subtitle ||
    `Dials → Contacts → Households Quoted → Sales (${granularityLabel(
      granularity
    )} view).`;

  const chartData = useMemo(() => {
    return buckets.map((bucket) => ({
      label: bucket.label,
      ...bucket.totals,
    }));
  }, [buckets]);

  if (isEmpty) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  return (
    <div className="stacked-area">
      <div className="stacked-area-header">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">{resolvedSubtitle}</div>
        </div>
      </div>
      <div className="stacked-area-canvas">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 12 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#64748b" }}
              minTickGap={18}
            />
            <YAxis
              tickFormatter={formatNumberShort}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={60}
              allowDecimals={false}
            />
            <Tooltip content={<ActivityFunnelTooltip />} />
            {STAGES.map((stage) => (
              <Line
                key={stage.key}
                type="monotone"
                dataKey={stage.key}
                name={stage.label}
                stroke={stage.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="stacked-area-legend">
        {STAGES.map((stage) => (
          <span key={stage.key} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: stage.color }}
            />
            {stage.label}
          </span>
        ))}
      </div>
    </div>
  );
}
