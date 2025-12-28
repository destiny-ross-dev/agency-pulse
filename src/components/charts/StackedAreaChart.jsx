import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoneyShort } from "../../lib/formatHelpers";

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#f97316",
  "#22c55e",
  "#0ea5e9",
  "#facc15",
  "#14b8a6",
];

function StackedAreaTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const formatter = formatValue || formatMoneyShort;

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{entry.name}</div>
      <div className="tooltip-label">{label}</div>
      <div className="tooltip-value">
        {formatter(Number(entry.value) || 0)}
      </div>
    </div>
  );
}

export default function StackedAreaChart({
  series,
  height = 240,
  title = "Issued Premium by Agent",
  subtitle = "Stacked totals per time period.",
  emptyMessage = "No issued premium data available for this date range.",
  formatValue = formatMoneyShort,
  formatTooltipValue,
  integerTicks = false,
}) {
  const buckets = useMemo(() => series?.buckets || [], [series]);
  const agents = useMemo(() => series?.agents || [], [series]);
  const isEmpty = buckets.length === 0 || agents.length === 0;
  const tooltipFormatter = formatTooltipValue || formatValue;

  const chartData = useMemo(() => {
    return buckets.map((bucket) => ({
      label: bucket.label,
      ...bucket.totals,
    }));
  }, [buckets]);

  const maxTotal = useMemo(() => {
    if (buckets.length === 0) return 0;
    return Math.max(...buckets.map((bucket) => bucket.total || 0), 0);
  }, [buckets]);

  if (isEmpty) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  return (
    <div className="stacked-area">
      <div className="stacked-area-header">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">{subtitle}</div>
        </div>
        <div className="chart-scale">
          <span>Max:</span> {formatValue(maxTotal)}
        </div>
      </div>
      <div className="stacked-area-canvas">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 12 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
            <XAxis
              dataKey="label"
              interval={0}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={60}
              allowDecimals={!integerTicks}
            />
            <Tooltip
              content={<StackedAreaTooltip formatValue={tooltipFormatter} />}
              formatter={(value) => tooltipFormatter(Number(value) || 0)}
              labelFormatter={(label) => label}
              shared={false}
            />
            {agents.map((agent, index) => (
              <Bar
                key={agent}
                dataKey={agent}
                name={agent}
                stackId="issued"
                fill={COLORS[index % COLORS.length]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="stacked-area-legend">
        {agents.map((agent, index) => (
          <span key={agent} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {agent}
          </span>
        ))}
      </div>
    </div>
  );
}
