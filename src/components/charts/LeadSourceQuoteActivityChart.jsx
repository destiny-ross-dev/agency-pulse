import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

function LeadSourceQuoteTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{entry.leadSource}</div>
      <div className="tooltip-label">Quote activity</div>
      <div className="tooltip-value">{entry.count.toLocaleString()}</div>
    </div>
  );
}

export default function LeadSourceQuoteActivityChart({
  rows,
  height,
  title = "Quote Activity by Lead Source",
  subtitle,
  rangeLabel,
  scope = "paid",
  onScopeChange,
  emptyMessage = "No quote activity in the selected date range.",
}) {
  const data = useMemo(() => rows || [], [rows]);
  const resolvedHeight =
    height || Math.min(520, Math.max(240, data.length * 28));
  const resolvedSubtitle =
    subtitle ||
    `Leads for all quotes and sales initially quoted during ${
      rangeLabel || "the selected range"
    }.`;

  if (data.length === 0) {
    return <div className="chart-empty">{emptyMessage}</div>;
  }

  return (
    <div className="stacked-area">
      <div className="stacked-area-header">
        <div>
          <div className="chart-title">{title}</div>
          <div className="chart-subtitle">{resolvedSubtitle}</div>
        </div>
        <div className="seg seg-scroll">
          <button
            type="button"
            className={scope === "paid" ? "active" : ""}
            onClick={() => onScopeChange?.("paid")}
          >
            Paid Only
          </button>
          <button
            type="button"
            className={scope === "all" ? "active" : ""}
            onClick={() => onScopeChange?.("all")}
          >
            All Sources
          </button>
        </div>
      </div>
      <div className="stacked-area-canvas">
        <ResponsiveContainer width="100%" height={resolvedHeight}>
          <PieChart margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
            <Tooltip content={<LeadSourceQuoteTooltip />} />
            <Pie
              data={data}
              dataKey="count"
              nameKey="leadSource"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={2}
              activeShape={false}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.leadSource}-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="stacked-area-legend">
        {data.map((entry, index) => (
          <span key={entry.leadSource} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {entry.leadSource}
          </span>
        ))}
      </div>
    </div>
  );
}
