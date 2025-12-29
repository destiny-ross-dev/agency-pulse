import StackedAreaChart from "../charts/StackedAreaChart";
import { formatNumberShort, money, pct } from "../../lib/formatHelpers";
import KPICard from "./KPICard";

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
        <KPICard
          as="button"
          type="button"
          className={`kpi--selectable ${isPremium ? "kpi--active" : ""}`}
          onClick={() => onChartModeChange?.("premium")}
          aria-pressed={isPremium}
          title="Total Issued Premium"
          value={metrics ? money(metrics.totalIssuedPremium) : "—"}
          hint="Sum of Issued Premium where Status = Issued."
        />

        <KPICard
          as="button"
          type="button"
          className={`kpi--selectable ${isPolicies ? "kpi--active" : ""}`}
          onClick={() => onChartModeChange?.("policies")}
          aria-pressed={isPolicies}
          title="Policies Issued"
          value={metrics ? metrics.policiesIssued.toLocaleString() : "—"}
          hint="Count of rows where Status = Issued."
        />

        <KPICard
          title="Conversion Rate"
          value={metrics ? pct(metrics.conversionRate) : "—"}
          hint="Issued / (Quoted + Issued)."
        />

        <KPICard
          title="Cost Per Acquisition (CPA)"
          value={metrics ? money(metrics.costPerAcquisition) : "—"}
          hint="Paid spend / Issued policies (MVP)."
        />
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
