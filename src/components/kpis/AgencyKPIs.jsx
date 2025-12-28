import StackedAreaChart from "../charts/StackedAreaChart";
import { formatNumberShort, money, pct } from "../../lib/formatHelpers";

export default function AgencyKPIs({
  metrics,
  issuedPremiumSeries,
  issuedPolicySeries,
  chartMode,
  onChartModeChange,
}) {
  const isPremium = chartMode === "premium";
  const isPolicies = chartMode === "policies";

  return (
    <>
      <div className="kpi-grid" style={{ marginTop: 14 }}>
        <button
          type="button"
          className={`kpi kpi--selectable ${isPremium ? "kpi--active" : ""}`}
          onClick={() => onChartModeChange?.("premium")}
          aria-pressed={isPremium}
        >
          <div className="kpi-title">Total Issued Premium</div>
          <div className="kpi-value">
            {metrics ? money(metrics.totalIssuedPremium) : "—"}
          </div>
          <div className="kpi-hint">
            Sum of Issued Premium where Status = Issued.
          </div>
        </button>

        <button
          type="button"
          className={`kpi kpi--selectable ${isPolicies ? "kpi--active" : ""}`}
          onClick={() => onChartModeChange?.("policies")}
          aria-pressed={isPolicies}
        >
          <div className="kpi-title">Policies Issued</div>
          <div className="kpi-value">
            {metrics ? metrics.policiesIssued.toLocaleString() : "—"}
          </div>
          <div className="kpi-hint">Count of rows where Status = Issued.</div>
        </button>

        <div className="kpi">
          <div className="kpi-title">Conversion Rate</div>
          <div className="kpi-value">
            {metrics ? pct(metrics.conversionRate) : "—"}
          </div>
          <div className="kpi-hint">Issued / (Quoted + Issued).</div>
        </div>

        <div className="kpi">
          <div className="kpi-title">Cost Per Acquisition (CPA)</div>
          <div className="kpi-value">
            {metrics ? money(metrics.costPerAcquisition) : "—"}
          </div>
          <div className="kpi-hint">Paid spend / Issued policies (MVP).</div>
        </div>
      </div>

      <StackedAreaChart
        series={isPolicies ? issuedPolicySeries : issuedPremiumSeries}
        title={
          isPolicies ? "Policies Issued by Agent" : "Issued Premium by Agent"
        }
        subtitle={
          isPolicies
            ? "Stacked policy counts per time period."
            : "Stacked totals per time period."
        }
        emptyMessage={
          isPolicies
            ? "No issued policy data available for this date range."
            : "No issued premium data available for this date range."
        }
        formatValue={isPolicies ? formatNumberShort : undefined}
        formatTooltipValue={
          isPolicies
            ? (value) => Number(value || 0).toLocaleString()
            : undefined
        }
        integerTicks={isPolicies}
      />
    </>
  );
}
