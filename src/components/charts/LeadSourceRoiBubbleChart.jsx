import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatMoneyShort, money, money2, ratio } from "../../lib/formatHelpers";

const COLORS = {
  paid: "#2563eb",
  free: "#94a3b8",
};

function LeadSourceRoiTooltip({ active, payload, yMode }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  const yValue =
    yMode === "efficiency"
      ? ratio(entry.premiumPerSpend)
      : money(entry.issuedPremium);

  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{entry.leadSource}</div>
      <div className="tooltip-label">
        {entry.paid ? "Paid Source" : "Free Source"}
      </div>
      <div className="tooltip-value">Spend: {money2(entry.spend)}</div>
      <div className="tooltip-value">
        {yMode === "efficiency" ? "Premium / $" : "Issued Premium"}: {yValue}
      </div>
      <div className="tooltip-value">
        Issued Policies: {entry.issued.toLocaleString()}
      </div>
    </div>
  );
}

export default function LeadSourceRoiBubbleChart({
  rows,
  height = 360,
  rangeLabel,
  title = "ROI Bubble View",
  subtitle,
  emptyMessage = "No lead source ROI data in the selected date range.",
}) {
  const [yMode, setYMode] = useState("issuedPremium");
  const data = useMemo(() => rows || [], [rows]);
  const paidData = useMemo(() => data.filter((row) => row.paid), [data]);
  const freeData = useMemo(() => data.filter((row) => !row.paid), [data]);
  const yKey = yMode === "efficiency" ? "premiumPerSpend" : "issuedPremium";
  const yTickFormatter =
    yMode === "efficiency" ? (value) => ratio(value) : formatMoneyShort;

  const resolvedSubtitle =
    subtitle ||
    `Spend vs ${
      yMode === "efficiency" ? "Premium / $" : "Issued Premium"
    } (${rangeLabel || "selected range"}).`;

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
            className={yMode === "issuedPremium" ? "active" : ""}
            onClick={() => setYMode("issuedPremium")}
          >
            Issued Premium
          </button>
          <button
            type="button"
            className={yMode === "efficiency" ? "active" : ""}
            onClick={() => setYMode("efficiency")}
          >
            Premium / $
          </button>
        </div>
      </div>
      <div className="stacked-area-canvas">
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 12 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" />
            <XAxis
              type="number"
              dataKey="spend"
              name="Spend"
              tickFormatter={formatMoneyShort}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name="Issued Premium"
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <ZAxis dataKey="issued" range={[40, 220]} name="Issued" />
            <Tooltip content={<LeadSourceRoiTooltip yMode={yMode} />} />
            <Scatter
              data={paidData}
              name="Paid"
              fill={COLORS.paid}
              isAnimationActive={false}
            />
            <Scatter
              data={freeData}
              name="Free"
              fill={COLORS.free}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="stacked-area-legend">
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: COLORS.paid }} />
          Paid sources
        </span>
        <span className="legend-item">
          <span className="legend-swatch" style={{ background: COLORS.free }} />
          Free sources
        </span>
      </div>
    </div>
  );
}
