import { Link } from "react-router-dom";

import Card from "../../components/common/Card";
import SectionTitle from "../../components/common/SectionTitle";
import { PulseIcon } from "../../components/common/icons";
import DataHealthPanel from "../../components/health/DataHealthPanel";
import GoalsPanel from "../../components/goals/GoalsPanel";
import FunnelDiagnostics from "../../components/funnel/FunnelDiagnostics";
import AgencyKPIs from "../../components/kpis/AgencyKPIs";
import LeadSourceQuoteActivityChart from "../../components/charts/LeadSourceQuoteActivityChart";
import LeadSourceRoiBubbleChart from "../../components/charts/LeadSourceRoiBubbleChart";
import { money, money2, pct, ratio } from "../../lib/formatHelpers";
export default function Dashboard({
  metrics,
  health,
  healthOpen,
  onToggleHealth,
  goalsOpen,
  onToggleGoals,
  kpiGoals,
  updateGoal,
  agentRows,
  agentView,
  setAgentView,
  issuedPremiumSeries,
  issuedPolicySeries,
  kpiChartMode,
  setKpiChartMode,
  rangeLabel,
  funnelData,
  funnelMode,
  setFunnelMode,
  selectedAgent,
  setSelectedAgent,
  setKpiGoals,
  roiRows,
  roiSort,
  setRoiSort,
  roiScope,
  setRoiScope,
  leadSourceQuoteActivity,
  leadSourceRoiBubbleRows,
  leadSourceScope,
  setLeadSourceScope,
  onBack,
  onStartOver,
}) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <DataHealthPanel
        health={health}
        open={healthOpen}
        onToggle={onToggleHealth}
      />

      <GoalsPanel
        open={goalsOpen}
        onToggle={onToggleGoals}
        goals={kpiGoals}
        updateGoal={updateGoal}
      />
      <Card pad>
        <SectionTitle
          icon={<PulseIcon />}
          title="Core Metrics"
          subtitle="Computed from the mapped files (now filterable by date range)."
        />

        <AgencyKPIs
          metrics={metrics}
          issuedPremiumSeries={issuedPremiumSeries}
          issuedPolicySeries={issuedPolicySeries}
          chartMode={kpiChartMode}
          onChartModeChange={setKpiChartMode}
        />

        <div className="table-card">
          <div className="table-toolbar">
            <div className="toolbar-left">
              <div>
                <div className="toolbar-title">Agent Comparison</div>
                <div className="small">
                  Compare totals and efficiency (normalized rates).
                </div>
              </div>

              <div className="seg seg-scroll" style={{ marginLeft: 6 }}>
                <button
                  type="button"
                  className={agentView === "totals" ? "active" : ""}
                  onClick={() => setAgentView("totals")}
                >
                  Totals
                </button>
                <button
                  type="button"
                  className={agentView === "efficiency" ? "active" : ""}
                  onClick={() => setAgentView("efficiency")}
                >
                  Efficiency
                </button>
              </div>

              <span className="pill-mini">
                Agents: {agentRows.length.toLocaleString()}
              </span>
            </div>

            <div className="small">
              Range: <b style={{ color: "#334155" }}>{rangeLabel}</b>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                {agentView === "totals" ? (
                  <tr>
                    <th>Agent</th>
                    <th className="right">Issued Premium</th>
                    <th className="right">Issued</th>
                    <th className="right">Quoted</th>
                    <th className="right">Dials</th>
                    <th className="right">Contacts</th>
                    <th className="right">Contact Ratio</th>
                    <th className="right">Conversion</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Agent</th>
                    <th className="right">Issued / 100 Dials</th>
                    <th className="right">Quotes / 100 Dials</th>
                    <th className="right">Issued Prem / Dial</th>
                    <th className="right">Issued Prem / Contact</th>
                    <th
                      className="right"
                      title="Successful contacts per 100 dials."
                    >
                      Contact Ratio
                    </th>
                    <th className="right">Avg Prem / Issued</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {agentRows.map((agent) => (
                  <tr key={agent.agent}>
                    <td style={{ fontWeight: 900 }}>
                      <Link
                        className="agent-link"
                        to={`/agents?agent=${encodeURIComponent(agent.agent)}`}
                      >
                        {agent.agent}
                      </Link>
                    </td>

                    {agentView === "totals" ? (
                      <>
                        <td className="right">{money(agent.issuedPremium)}</td>
                        <td className="right">
                          {agent.issued.toLocaleString()}
                        </td>
                        <td className="right">
                          {agent.quotes.toLocaleString()}
                        </td>
                        <td className="right">
                          {agent.dials.toLocaleString()}
                        </td>
                        <td className="right">
                          {agent.contacts.toLocaleString()}
                        </td>
                        <td className="right">{pct(agent.contactRate)}</td>
                        <td className="right">{pct(agent.conversionRate)}</td>
                      </>
                    ) : (
                      <>
                        <td className="right">
                          {agent.issuedPer100Dials.toFixed(1)}
                        </td>
                        <td className="right">
                          {agent.quotesPer100Dials.toFixed(1)}
                        </td>
                        <td className="right">
                          {money(agent.issuedPremPerDial)}
                        </td>
                        <td className="right">
                          {money(agent.issuedPremPerContact)}
                        </td>
                        <td className="right">{pct(agent.contactRate)}</td>
                        <td className="right">
                          {money(agent.issuedPremPerIssued)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {agentRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: 14,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      No agent data in the selected date range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <FunnelDiagnostics
          funnelData={funnelData}
          funnelMode={funnelMode}
          setFunnelMode={setFunnelMode}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          goals={kpiGoals}
          setKpiGoals={setKpiGoals}
        />

        <div className="table-card" style={{ marginTop: 16 }}>
          <div className="table-toolbar">
            <div className="toolbar-left">
              <div>
                <div className="toolbar-title">Lead Source ROI</div>
                <div className="small">
                  Spend, volume, and outcomes by lead source (date-filtered).
                </div>
              </div>

              <div className="seg seg-scroll" style={{ marginLeft: 6 }}>
                <button
                  type="button"
                  className={roiSort === "premiumPerSpend" ? "active" : ""}
                  onClick={() => setRoiSort("premiumPerSpend")}
                >
                  Best ROI
                </button>
                <button
                  type="button"
                  className={roiSort === "issuedPremium" ? "active" : ""}
                  onClick={() => setRoiSort("issuedPremium")}
                >
                  Most Premium
                </button>
                <button
                  type="button"
                  className={roiSort === "cpa" ? "active" : ""}
                  onClick={() => setRoiSort("cpa")}
                >
                  Lowest CPA
                </button>
              </div>

              <div className="seg seg-scroll" style={{ marginLeft: 6 }}>
                <button
                  type="button"
                  className={roiScope === "paid" ? "active" : ""}
                  onClick={() => setRoiScope("paid")}
                >
                  Paid Only
                </button>
                <button
                  type="button"
                  className={roiScope === "all" ? "active" : ""}
                  onClick={() => setRoiScope("all")}
                >
                  All Sources
                </button>
              </div>

              <div className="roi-badges">
                {health?.cross ? (
                  <span
                    className={`kpi-tag ${
                      health.cross.paidSourcesWithNoQuoteSales > 0
                        ? "warn"
                        : "good"
                    }`}
                  >
                    <span className="muted">Unmatched paid sources:</span>{" "}
                    {health.cross.paidSourcesWithNoQuoteSales.toLocaleString()}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="small">
              Range: <b style={{ color: "#334155" }}>{rangeLabel}</b>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="lead-source-col">Lead Source</th>
                  <th className="right">Leads</th>
                  <th className="right">Spend</th>
                  <th className="right">$/Lead</th>
                  <th className="right">Quoted</th>
                  <th className="right">Issued</th>
                  <th className="right">Conversion</th>
                  <th className="right">CPA</th>
                  <th className="right">Issued Premium</th>
                  <th className="right">Premium / $</th>
                </tr>
              </thead>

              <tbody>
                {roiRows.map((row) => (
                  <tr key={row.leadSource}>
                    <td className="lead-source-cell" style={{ fontWeight: 900 }}>
                      {row.leadSource}
                    </td>
                    <td className="right">{row.leads.toLocaleString()}</td>
                    <td className="right">{money2(row.spend)}</td>
                    <td className="right">{money2(row.spendPerLead)}</td>
                    <td className="right">{row.quoted.toLocaleString()}</td>
                    <td className="right">{row.issued.toLocaleString()}</td>
                    <td className="right">{pct(row.conversion)}</td>
                    <td className="right">{row.cpa ? money2(row.cpa) : "—"}</td>
                    <td className="right">{money(row.issuedPremium)}</td>
                    <td className="right">
                      {row.premiumPerSpend ? ratio(row.premiumPerSpend) : "—"}
                    </td>
                  </tr>
                ))}

                {roiRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: 14,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      No lead source data in the selected date range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-grid">
          <LeadSourceQuoteActivityChart
            rows={leadSourceQuoteActivity}
            rangeLabel={rangeLabel}
            scope={leadSourceScope}
            onScopeChange={setLeadSourceScope}
          />
          <LeadSourceRoiBubbleChart
            rows={leadSourceRoiBubbleRows}
            rangeLabel={rangeLabel}
          />
        </div>

        <div style={{ marginTop: 16 }} className="mapping-table">
          <div className="mapping-header">
            <div>Extra MVP Insight</div>
            <div>Value</div>
          </div>
          <div className="mapping-row">
            <div className="field-name">Paid Lead Spend</div>
            <div style={{ fontWeight: 800 }}>
              {metrics ? money(metrics.paidSpend) : "—"}
            </div>
          </div>
          <div className="mapping-row">
            <div className="field-name">Total Dials</div>
            <div style={{ fontWeight: 800 }}>
              {metrics ? metrics.totalDials.toLocaleString() : "—"}
            </div>
          </div>
          <div className="mapping-row">
            <div className="field-name">Premium per Dial</div>
            <div style={{ fontWeight: 800 }}>
              {metrics ? money(metrics.premiumPerDial) : "—"}
            </div>
          </div>
        </div>

        <div className="actions" style={{ justifyContent: "space-between" }}>
          <button className="btn" onClick={onBack}>
            Back
          </button>
          <button className="btn" onClick={onStartOver}>
            Start Over
          </button>
        </div>
      </Card>
    </div>
  );
}
