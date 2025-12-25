import Card from "../common/Card";
import SectionTitle from "../common/SectionTitle";
import SegButton from "../common/SegButton";
import { PulseIcon } from "../common/icons";
import DataHealthPanel from "../health/DataHealthPanel";
import KPIGoals from "../goals/KPIGoals";
import FunnelDiagnostics from "../funnel/FunnelDiagnostics";
import { money, money2, pct, ratio } from "../../lib/formatHelpers";
import { formatYMD } from "../../lib/dates";

export default function AnalyzeStep({
  metrics,
  health,
  healthOpen,
  onToggleHealth,
  kpiGoals,
  updateGoal,
  agentRows,
  agentView,
  setAgentView,
  rangeMode,
  setRangeMode,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  coverage,
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
  onBack,
  onStartOver,
}) {
  return (
    <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
      <Card pad>
        <SectionTitle
          icon={<PulseIcon />}
          title="Core Metrics"
          subtitle="Computed from the mapped files (now filterable by date range)."
        />

        <div className="filters">
          <div className="filters-left">
            <span className="filters-title">Date Range</span>

            <div className="seg">
              <SegButton
                active={rangeMode === "all"}
                onClick={() => setRangeMode("all")}
              >
                All Time
              </SegButton>
              <SegButton
                active={rangeMode === "7d"}
                onClick={() => setRangeMode("7d")}
              >
                Last 7
              </SegButton>
              <SegButton
                active={rangeMode === "30d"}
                onClick={() => setRangeMode("30d")}
              >
                Last 30
              </SegButton>
              <SegButton
                active={rangeMode === "custom"}
                onClick={() => setRangeMode("custom")}
              >
                Custom
              </SegButton>
            </div>

            {rangeMode === "custom" ? (
              <>
                <input
                  className="date-input"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span style={{ color: "var(--muted2)", fontWeight: 800 }}>
                  to
                </span>
                <input
                  className="date-input"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </>
            ) : null}
          </div>

          <div className="filters-right">
            {coverage ? (
              <div
                className="coverage"
                title="Date coverage detected from your uploaded files"
              >
                <span className="dot" />
                <span className="label">Coverage:</span>
                <span className="range">
                  {formatYMD(coverage.start)} → {formatYMD(coverage.end)}
                </span>
              </div>
            ) : (
              <span>Coverage: —</span>
            )}

            <span style={{ marginLeft: 10 }}>Showing:</span>
            <span style={{ color: "#334155" }}>{rangeLabel}</span>
          </div>
        </div>

        <DataHealthPanel
          health={health}
          open={healthOpen}
          onToggle={onToggleHealth}
        />

        <KPIGoals goals={kpiGoals} updateGoal={updateGoal} />

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

        <div className="table-card">
          <div className="table-toolbar">
            <div className="toolbar-left">
              <div>
                <div className="toolbar-title">Agent Comparison</div>
                <div className="small">
                  Compare totals and efficiency (normalized rates).
                </div>
              </div>

              <div className="seg" style={{ marginLeft: 6 }}>
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
                    <td style={{ fontWeight: 900 }}>{agent.agent}</td>

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

              <div className="seg" style={{ marginLeft: 6 }}>
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

              <div className="seg" style={{ marginLeft: 6 }}>
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
                  <th>Lead Source</th>
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
                    <td style={{ fontWeight: 900 }}>{row.leadSource}</td>
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
