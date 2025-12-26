import StackedAreaChart from "../charts/StackedAreaChart";
import { money, pct } from "../../lib/formatHelpers";

export default function AgencyKPIs({ metrics, issuedPremiumSeries }) {
  return (
    <>
      <div className="kpi-grid" style={{ marginTop: 14 }}>
        <div className="kpi">
          <div className="kpi-title">Total Issued Premium</div>
          <div className="kpi-value">
            {metrics ? money(metrics.totalIssuedPremium) : "—"}
          </div>
          <div className="kpi-hint">
            Sum of Issued Premium where Status = Issued.
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-title">Policies Issued</div>
          <div className="kpi-value">
            {metrics ? metrics.policiesIssued.toLocaleString() : "—"}
          </div>
          <div className="kpi-hint">Count of rows where Status = Issued.</div>
        </div>

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

      <StackedAreaChart series={issuedPremiumSeries} />
    </>
  );
}
