import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Card from "../../components/common/Card";
import SectionTitle from "../../components/common/SectionTitle";
import {
  LightbulbIcon,
  PersonIcon,
  PulseIcon,
  QuotesIcon,
  SalesIcon,
} from "../../components/common/icons";
import PageHeader from "../../components/layout/PageHeader";
import { useWorkflowData } from "../../context/WorkflowData";
import { formatYMD, parseDateLoose } from "../../lib/dates";
import { money, pct } from "../../lib/formatHelpers";

export default function Agents({ agentInsights }) {
  const [agentView, setAgentView] = useState("totals");
  const [selectedAgent, setSelectedAgent] = useState("");
  const { canAnalyze, filteredRows, agentRows, rangeLabel } = useWorkflowData();
  const insightsByAgent = agentInsights?.byAgent || {};

  const totals = filteredRows
    ? {
        activity: filteredRows.activityRows.length,
        quoteSales: filteredRows.quoteSalesRows.length,
      }
    : null;

  useEffect(() => {
    if (!selectedAgent && agentRows.length > 0) {
      setSelectedAgent(agentRows[0].agent);
    }
  }, [agentRows, selectedAgent]);

  const selectedInsights = selectedAgent
    ? insightsByAgent[selectedAgent]
    : null;
  const quoteSalesRows = filteredRows?.quoteSalesRows || [];

  function formatDate(value) {
    const parsed = parseDateLoose(value);
    return parsed ? formatYMD(parsed) : "—";
  }

  function formatPremium(value) {
    const premium = Number(value);
    if (!Number.isFinite(premium) || premium === 0) return "—";
    return money(premium);
  }

  const selectedQuoteSalesRows = selectedAgent
    ? quoteSalesRows.filter(
        (row) => String(row?.agent_name || "").trim() === selectedAgent
      )
    : [];

  const quotedRows = selectedQuoteSalesRows.filter(
    (row) => String(row?.status || "").toLowerCase() === "quoted"
  );
  const issuedRows = selectedQuoteSalesRows.filter(
    (row) => String(row?.status || "").toLowerCase() === "issued"
  );

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
                    const insightFlags =
                      insightsByAgent[agent.agent]?.flags || [];
                    const isSelected = agent.agent === selectedAgent;
                    return (
                      <tr key={agent.agent}>
                        <td style={{ fontWeight: 900 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgent(agent.agent)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              fontWeight: 900,
                              color: isSelected ? "#1d4ed8" : "inherit",
                            }}
                          >
                            {agent.agent}
                          </button>
                        </td>

                        {agentView === "totals" ? (
                          <>
                            <td className="right">
                              {money(agent.issuedPremium)}
                            </td>
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
                            <td className="right">
                              {pct(agent.conversionRate)}
                            </td>
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
                    );
                  })}

                  {agentRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
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

          <div style={{ marginTop: 24 }}>
            <SectionTitle
              icon={<PersonIcon />}
              title={
                selectedAgent
                  ? `Agent Details: ${selectedAgent}`
                  : "Agent Details"
              }
              subtitle="Select an agent to view KPI cards, insights, and policy activity."
            />

            {!selectedAgent ? (
              <div className="small" style={{ marginTop: 8 }}>
                Select an agent to view insights.
              </div>
            ) : (
              <>
                <div className="kpi-grid" style={{ marginTop: 12 }}>
                  <div className="kpi">
                    <div className="kpi-title">Dials</div>
                    <div className="kpi-value">
                      {selectedInsights?.kpis?.dials?.toLocaleString?.() || "0"}
                    </div>
                    <div className="kpi-hint">Total dials logged.</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Contacts</div>
                    <div className="kpi-value">
                      {selectedInsights?.kpis?.contacts?.toLocaleString?.() ||
                        "0"}
                    </div>
                    <div className="kpi-hint">Reached contacts.</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Quotes</div>
                    <div className="kpi-value">
                      {selectedInsights?.kpis?.quotes?.toLocaleString?.() ||
                        "0"}
                    </div>
                    <div className="kpi-hint">Quotes sent.</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Issued</div>
                    <div className="kpi-value">
                      {selectedInsights?.kpis?.issued?.toLocaleString?.() ||
                        "0"}
                    </div>
                    <div className="kpi-hint">Policies issued.</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Contact Rate</div>
                    <div className="kpi-value">
                      {pct(selectedInsights?.kpis?.contactRate || 0)}
                    </div>
                    <div className="kpi-hint">Contacts per dial.</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Conversion Rate</div>
                    <div className="kpi-value">
                      {pct(selectedInsights?.kpis?.conversionRate || 0)}
                    </div>
                    <div className="kpi-hint">Issued / (Quoted + Issued).</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-title">Issued Premium</div>
                    <div className="kpi-value">
                      {money(selectedInsights?.kpis?.issuedPremium || 0)}
                    </div>
                    <div className="kpi-hint">Total issued premium.</div>
                  </div>
                </div>

                <SectionTitle
                  icon={<LightbulbIcon />}
                  title="Insights"
                  subtitle="Summary of insight flags for the selected agent."
                />
                <Card pad style={{ marginTop: 12 }}>
                  <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                    {(selectedInsights?.flags || []).map((flag) => (
                      <li key={flag.key} style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{flag.label}</div>
                        <div>{flag.detail}</div>
                      </li>
                    ))}
                  </ul>
                </Card>

                <SectionTitle
                  icon={<QuotesIcon />}
                  title="Quotes"
                  subtitle="Quote activity for the selected agent."
                />
                <div className="table-card" style={{ marginTop: 12 }}>
                  <div className="table-toolbar">
                    <div className="toolbar-left">
                      <div>
                        <div className="toolbar-title">Quotes Log</div>
                        <div className="small">
                          {quotedRows.length.toLocaleString()} quotes in the
                          selected range.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date Quoted</th>
                          <th>Policyholder</th>
                          <th>LOB</th>
                          <th>Policy Type</th>
                          <th>Business Type</th>
                          <th className="right">Quoted Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotedRows.map((row, index) => (
                          <tr key={`${row?.agent_name}-quoted-${index}`}>
                            <td>{formatDate(row?.date)}</td>
                            <td>{row?.policyholder || "—"}</td>
                            <td>{row?.line_of_business || "—"}</td>
                            <td>{row?.policy_type || "—"}</td>
                            <td>{row?.business_type || "—"}</td>
                            <td className="right">
                              {formatPremium(row?.written_premium)}
                            </td>
                          </tr>
                        ))}
                        {quotedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: 14,
                                color: "var(--muted)",
                                fontWeight: 700,
                              }}
                            >
                              No quoted policies for this agent.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <SectionTitle
                  icon={<SalesIcon />}
                  title="Issued Policies"
                  subtitle="Issued policies for the selected agent."
                />
                <div className="table-card" style={{ marginTop: 12 }}>
                  <div className="table-toolbar">
                    <div className="toolbar-left">
                      <div>
                        <div className="toolbar-title">Issued Policies</div>
                        <div className="small">
                          {issuedRows.length.toLocaleString()} issued policies
                          in the selected range.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date Quoted</th>
                          <th>Date Issued</th>
                          <th>Policyholder</th>
                          <th>LOB</th>
                          <th>Policy Type</th>
                          <th>Business Type</th>
                          <th className="right">Quoted Premium</th>
                          <th className="right">Issued Premium</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedRows.map((row, index) => {
                          console.log(row);
                          return (
                            <tr key={`${row?.agent_name}-issued-${index}`}>
                              <td>{formatDate(row?.date)}</td>
                              <td>{formatDate(row?.date_issued)}</td>
                              <td>{row?.policyholder || "—"}</td>
                              <td>{row?.line_of_business || "—"}</td>
                              <td>{row?.policy_type || "—"}</td>
                              <td>{row?.business_type || "—"}</td>
                              <td className="right">
                                {formatPremium(row?.written_premium)}
                              </td>
                              <td className="right">
                                {formatPremium(row?.issued_premium)}
                              </td>
                            </tr>
                          );
                        })}
                        {issuedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: 14,
                                color: "var(--muted)",
                                fontWeight: 700,
                              }}
                            >
                              No issued policies for this agent.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
