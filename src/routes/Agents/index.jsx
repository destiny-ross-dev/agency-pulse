import { useState } from "react";
import { Link } from "react-router-dom";

import Card from "../../components/common/Card";
import SectionTitle from "../../components/common/SectionTitle";
import { PulseIcon } from "../../components/common/icons";
import PageHeader from "../../components/layout/PageHeader";
import { useWorkflowData } from "../../context/WorkflowData";
import { money, pct } from "../../lib/formatHelpers";

export default function Agents({ agentInsights }) {
  const [agentView, setAgentView] = useState("totals");
  const { canAnalyze, filteredRows, agentRows, rangeLabel } =
    useWorkflowData();
  const insightsByAgent = agentInsights?.byAgent || {};

  const totals = filteredRows
    ? {
        activity: filteredRows.activityRows.length,
        quoteSales: filteredRows.quoteSalesRows.length,
      }
    : null;

  return (
    <div className="container">
      <PageHeader
        title="Agent Performance"
        subtitle="Review agent totals and efficiency using the same filtered data as the main dashboard."
      />

      {!canAnalyze ? (
        <div className="alert">
          Upload and map your data first to unlock agent insights. Visit the{" "}
          <Link to="/import-data">data import step</Link> to get started.
        </div>
      ) : (
        <Card pad>
          <SectionTitle
            icon={<PulseIcon />}
            title="Agent Snapshot"
            subtitle="Totals and rate-based efficiency across the current date range."
          />

          <div className="table-card" style={{ marginTop: 16 }}>
            <div className="table-toolbar">
              <div className="toolbar-left">
                <div>
                  <div className="toolbar-title">Agent Comparison</div>
                  <div className="small">
                    Activity rows: {totals?.activity?.toLocaleString()} • Quote
                    rows: {totals?.quoteSales?.toLocaleString()}
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
                  {agentRows.map((agent) => {
                    const insightFlags = insightsByAgent[agent.agent]?.flags || [];
                    return (
                    <tr key={agent.agent} data-insights={insightFlags.length}>
                      <td style={{ fontWeight: 900 }}>{agent.agent}</td>

                      {agentView === "totals" ? (
                        <>
                          <td className="right">{money(agent.issuedPremium)}</td>
                          <td className="right">{agent.issued.toLocaleString()}</td>
                          <td className="right">{agent.quotes.toLocaleString()}</td>
                          <td className="right">{agent.dials.toLocaleString()}</td>
                          <td className="right">{agent.contacts.toLocaleString()}</td>
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
                          <td className="right">{money(agent.issuedPremPerDial)}</td>
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
                  )})}

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
        </Card>
      )}
    </div>
  );
}
