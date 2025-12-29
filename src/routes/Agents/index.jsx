import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Card from "../../components/common/Card";
import SectionTitle from "../../components/common/SectionTitle";
import {
  LightbulbIcon,
  PersonIcon,
  PulseIcon,
  QuotesIcon,
  SalesIcon,
} from "../../components/common/icons";
import { useWorkflowData } from "../../context/useWorkflowData";
import { money, pct, ratio, formatReadableDate } from "../../lib/formatHelpers";
import KPICard from "../../components/kpis/KPICard";

function collectOptions(rows, key) {
  const values = new Set();
  rows.forEach((row) => {
    const value = String(row?.[key] || "").trim();
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function applyQuoteFilters(rows, filters) {
  return rows.filter((row) => {
    if (
      filters.lob &&
      String(row?.line_of_business || "").trim() !== filters.lob
    ) {
      return false;
    }
    if (
      filters.policyType &&
      String(row?.policy_type || "").trim() !== filters.policyType
    ) {
      return false;
    }
    if (
      filters.businessType &&
      String(row?.business_type || "").trim() !== filters.businessType
    ) {
      return false;
    }
    return true;
  });
}

export default function Agents({ agentInsights }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [agentView, setAgentView] = useState("totals");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [quoteFilters, setQuoteFilters] = useState({
    lob: "",
    policyType: "",
    businessType: "",
  });
  const [issuedFilters, setIssuedFilters] = useState({
    lob: "",
    policyType: "",
    businessType: "",
  });
  const {
    canAnalyze,
    filteredRows,
    agentRows,
    allAgentRows,
    rangeLabel,
    kpiGoals,
  } = useWorkflowData();
  const insightsByAgent = agentInsights?.byAgent || {};
  const displayAgents = allAgentRows.length > 0 ? allAgentRows : agentRows;
  const agentRowsByName = new Map(
    agentRows.map((agent) => [agent.agent, agent])
  );

  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (!agentParam) return;
    const normalized = agentParam.trim();
    if (!normalized) return;
    const hasAgent = displayAgents.some((agent) => agent.agent === normalized);
    const nextAgent = hasAgent ? normalized : agentParam;
    setSelectedAgent((prev) => (prev === nextAgent ? prev : nextAgent));
  }, [searchParams, displayAgents]);

  function handleSelectAgent(agentName) {
    setSelectedAgent(agentName);
    setSearchParams(`agent=${encodeURIComponent(agentName)}`);
  }

  const totals = filteredRows
    ? {
        activity: filteredRows.activityRows.length,
        quoteSales: filteredRows.quoteSalesRows.length,
      }
    : null;

  const activeSelectedAgent =
    selectedAgent || (displayAgents.length > 0 ? displayAgents[0].agent : "");

  const selectedInsights = activeSelectedAgent
    ? insightsByAgent[activeSelectedAgent]
    : null;
  const quoteSalesRows = filteredRows?.quoteSalesRows || [];
  const agencyContactRate = agentInsights?.benchmarks?.contactRate ?? 0;
  const agencyPitchRate = agentInsights?.benchmarks?.pitchRate ?? 0;
  const contactRateTarget = (kpiGoals?.contactRateTargetPct ?? 10) / 100;
  const pitchRateTarget = (kpiGoals?.quoteRateTargetPct ?? 30) / 100;

  function formatDate(value) {
    const formatted = formatReadableDate(value);
    return formatted || "—";
  }

  function formatPremium(value) {
    const premium = Number(value);
    if (!Number.isFinite(premium) || premium === 0) return "—";
    return money(premium);
  }

  const selectedQuoteSalesRows = activeSelectedAgent
    ? quoteSalesRows.filter(
        (row) => String(row?.agent_name || "").trim() === activeSelectedAgent
      )
    : [];

  const quotedRows = selectedQuoteSalesRows.filter(
    (row) => String(row?.status || "").toLowerCase() === "quoted"
  );
  const issuedRows = selectedQuoteSalesRows.filter(
    (row) => String(row?.status || "").toLowerCase() === "issued"
  );
  const quoteLobOptions = useMemo(
    () => collectOptions(quotedRows, "line_of_business"),
    [quotedRows]
  );
  const quotePolicyTypeOptions = useMemo(() => {
    const rows = quoteFilters.lob
      ? quotedRows.filter(
          (row) =>
            String(row?.line_of_business || "").trim() === quoteFilters.lob
        )
      : quotedRows;
    return collectOptions(rows, "policy_type");
  }, [quotedRows, quoteFilters.lob]);
  const quoteBusinessTypeOptions = useMemo(
    () => collectOptions(quotedRows, "business_type"),
    [quotedRows]
  );
  const issuedLobOptions = useMemo(
    () => collectOptions(issuedRows, "line_of_business"),
    [issuedRows]
  );
  const issuedPolicyTypeOptions = useMemo(() => {
    const rows = issuedFilters.lob
      ? issuedRows.filter(
          (row) =>
            String(row?.line_of_business || "").trim() === issuedFilters.lob
        )
      : issuedRows;
    return collectOptions(rows, "policy_type");
  }, [issuedRows, issuedFilters.lob]);
  const issuedBusinessTypeOptions = useMemo(
    () => collectOptions(issuedRows, "business_type"),
    [issuedRows]
  );
  const filteredQuotedRows = useMemo(
    () => applyQuoteFilters(quotedRows, quoteFilters),
    [quotedRows, quoteFilters]
  );
  const filteredIssuedRows = useMemo(
    () => applyQuoteFilters(issuedRows, issuedFilters),
    [issuedRows, issuedFilters]
  );
  const contactRateInsight = useMemo(() => {
    if (!selectedInsights) return null;
    const dials = selectedInsights?.kpis?.dials ?? 0;
    if (dials <= 0) return null;

    const agentRate = selectedInsights?.kpis?.contactRate ?? 0;
    const averageRate = agencyContactRate;
    const targetRate = contactRateTarget;

    const averageDelta = agentRate - averageRate;
    const targetDelta = agentRate - targetRate;

    const averageLine =
      averageRate > 0
        ? `Contact rate of ${pct(Math.abs(agentRate))} is ${pct(
            Math.abs(averageDelta)
          )} ${averageDelta >= 0 ? "above" : "below"} the agency average (${pct(
            averageRate
          )}).`
        : "Agency average contact rate is not available yet.";

    const targetLine =
      targetRate > 0
        ? `Agent is ${pct(Math.abs(targetDelta))} ${
            targetDelta >= 0 ? "above" : "below"
          } the target (${pct(targetRate)}).`
        : null;

    let coachingHint = "";
    if (
      averageRate > 0 &&
      targetRate > 0 &&
      agentRate < averageRate &&
      agentRate < targetRate
    ) {
      coachingHint =
        " This suggests dialing strategy, timing, or list quality may be the biggest lever.";
    }

    return {
      key: "contact-rate-gap",
      label: "Contact Efficiency",
      detail:
        [averageLine, targetLine].filter(Boolean).join(" ") + coachingHint,
    };
  }, [selectedInsights, agencyContactRate, contactRateTarget]);

  const pitchRateInsight = useMemo(() => {
    if (!selectedInsights) return null;
    const contacts = selectedInsights?.kpis?.contacts ?? 0;
    if (contacts <= 0) return null;

    const agentRate = selectedInsights?.kpis?.pitchRate ?? 0;
    const averageRate = agencyPitchRate;
    const targetRate = pitchRateTarget;

    const averageDelta = agentRate - averageRate;
    const targetDelta = agentRate - targetRate;

    const averageLine =
      averageRate > 0
        ? `Pitch rate of ${pct(Math.abs(agentRate))} is ${pct(
            Math.abs(averageDelta)
          )} ${averageDelta >= 0 ? "above" : "below"} the agency average (${pct(
            averageRate
          )}).`
        : "Agency average pitch rate is not available yet.";

    const targetLine =
      targetRate > 0
        ? `Agent is ${pct(Math.abs(targetDelta))} ${
            targetDelta >= 0 ? "above" : "below"
          } the target (${pct(targetRate)}).`
        : null;

    let coachingHint = "";
    if (
      averageRate > 0 &&
      targetRate > 0 &&
      agentRate < averageRate &&
      agentRate < targetRate
    ) {
      coachingHint =
        " This suggests pitch quality, qualification, or discovery may be the biggest lever.";
    }

    return {
      key: "pitch-rate-gap",
      label: "Pitch Efficiency",
      detail:
        [averageLine, targetLine].filter(Boolean).join(" ") + coachingHint,
    };
  }, [selectedInsights, agencyPitchRate, pitchRateTarget]);

  const selectedFlags = [
    ...(contactRateInsight ? [contactRateInsight] : []),
    ...(pitchRateInsight ? [pitchRateInsight] : []),
    ...(selectedInsights?.flags || []),
  ];

  return (
    <div className="container">
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
                  Agents: {displayAgents.length.toLocaleString()}
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
                  {displayAgents.map((agent) => {
                    const rowData = agentRowsByName.get(agent.agent);
                    const isSelected = agent.agent === activeSelectedAgent;
                    return (
                      <tr key={agent.agent}>
                        <td style={{ fontWeight: 900 }}>
                          <button
                            type="button"
                            onClick={() => handleSelectAgent(agent.agent)}
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
                              {rowData ? money(rowData.issuedPremium) : "—"}
                            </td>
                            <td className="right">
                              {rowData ? rowData.issued.toLocaleString() : "—"}
                            </td>
                            <td className="right">
                              {rowData ? rowData.quotes.toLocaleString() : "—"}
                            </td>
                            <td className="right">
                              {rowData ? rowData.dials.toLocaleString() : "—"}
                            </td>
                            <td className="right">
                              {rowData
                                ? rowData.contacts.toLocaleString()
                                : "—"}
                            </td>
                            <td className="right">
                              {rowData ? pct(rowData.contactRate) : "—"}
                            </td>
                            <td className="right">
                              {rowData ? pct(rowData.conversionRate) : "—"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="right">
                              {rowData
                                ? rowData.issuedPer100Dials.toFixed(1)
                                : "—"}
                            </td>
                            <td className="right">
                              {rowData
                                ? rowData.quotesPer100Dials.toFixed(1)
                                : "—"}
                            </td>
                            <td className="right">
                              {rowData ? money(rowData.issuedPremPerDial) : "—"}
                            </td>
                            <td className="right">
                              {rowData
                                ? money(rowData.issuedPremPerContact)
                                : "—"}
                            </td>
                            <td className="right">
                              {rowData ? pct(rowData.contactRate) : "—"}
                            </td>
                            <td className="right">
                              {rowData
                                ? money(rowData.issuedPremPerIssued)
                                : "—"}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {displayAgents.length === 0 ? (
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

          <div style={{ marginTop: 24, marginBottom: 24 }}>
            <SectionTitle
              icon={<PersonIcon />}
              title={
                selectedAgent
                  ? `Agent Details: ${activeSelectedAgent}`
                  : "Agent Details"
              }
              subtitle="Select an agent to view KPI cards, insights, and policy activity."
            />

            {!activeSelectedAgent ? (
              <div className="small" style={{ marginTop: 8 }}>
                Select an agent to view insights.
              </div>
            ) : (
              <>
                <div
                  className="kpi-grid kpi-grid--agent"
                  style={{ marginTop: 12 }}
                >
                  <KPICard
                    title="Dials"
                    value={
                      selectedInsights?.kpis?.dials?.toLocaleString?.() || "0"
                    }
                    hint="Total dials logged."
                  />
                  <KPICard
                    title="Contacts"
                    value={
                      selectedInsights?.kpis?.contacts?.toLocaleString?.() ||
                      "0"
                    }
                    hint="Reached contacts."
                  />
                  <KPICard
                    title="Quotes"
                    value={
                      selectedInsights?.kpis?.quotes?.toLocaleString?.() || "0"
                    }
                    hint="Quotes sent."
                  />
                  <KPICard
                    title="Issued"
                    value={
                      selectedInsights?.kpis?.issued?.toLocaleString?.() || "0"
                    }
                    hint="Policies issued."
                  />
                  <KPICard
                    title="Contact Rate"
                    value={pct(selectedInsights?.kpis?.contactRate || 0)}
                    hint="Contacts per dial."
                  />
                  <KPICard
                    title="Pitch Rate"
                    value={pct(selectedInsights?.kpis?.pitchRate || 0)}
                    hint="Quotes per contact."
                  />
                  <KPICard
                    title="Conversion Rate"
                    value={pct(selectedInsights?.kpis?.conversionRate || 0)}
                    hint="Issued / (Quoted + Issued)."
                  />
                  <KPICard
                    title="Issued Premium"
                    value={money(selectedInsights?.kpis?.issuedPremium || 0)}
                    hint="Total issued premium."
                  />

                  <KPICard
                    title="Multiline Pitch Rate"
                    value={pct(selectedInsights?.kpis?.multilinePitchRate || 0)}
                    hint="Percentage of Households who were quoted multiple products"
                  />
                  <KPICard
                    title="Multiline Conversion Rate"
                    value={pct(
                      selectedInsights?.kpis?.multilineConversionRate || 0
                    )}
                    hint="Multiline pitch -> Multiline sales"
                  />
                  <KPICard
                    title="Attach Rate"
                    value={ratio(selectedInsights?.kpis?.attachRate || 0)}
                    hint="Issued policies per issued policyholder"
                  />
                  <KPICard
                    title="Multiline Lift"
                    value={
                      selectedInsights?.kpis?.multilineLift == null
                        ? "N/A"
                        : money(selectedInsights?.kpis?.multilineLift || 0)
                    }
                    hint="Average difference between multiline and singleline sales"
                  />
                </div>

                <SectionTitle
                  icon={<LightbulbIcon />}
                  title="Insights"
                  subtitle="Summary of insight flags for the selected agent."
                />
                <Card pad style={{ marginTop: 12 }}>
                  <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                    {selectedFlags.map((flag) => (
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
                  <div className="table-toolbar table-toolbar--filters">
                    <div className="toolbar-left">
                      <div>
                        <div className="toolbar-title">Quotes Log</div>
                        <div className="small">
                          {filteredQuotedRows.length.toLocaleString()} quotes in
                          the selected range.
                        </div>
                      </div>
                    </div>
                    <div className="toolbar-filters">
                      <select
                        className="select table-filter"
                        value={quoteFilters.lob}
                        onChange={(e) =>
                          setQuoteFilters((prev) => ({
                            ...prev,
                            lob: e.target.value,
                          }))
                        }
                      >
                        <option value="">All LOB</option>
                        {quoteLobOptions.map((lob) => (
                          <option key={lob} value={lob}>
                            {lob}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select table-filter"
                        value={quoteFilters.policyType}
                        onChange={(e) =>
                          setQuoteFilters((prev) => ({
                            ...prev,
                            policyType: e.target.value,
                          }))
                        }
                      >
                        <option value="">All Policy Types</option>
                        {quotePolicyTypeOptions.map((policyType) => (
                          <option key={policyType} value={policyType}>
                            {policyType}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select table-filter"
                        value={quoteFilters.businessType}
                        onChange={(e) =>
                          setQuoteFilters((prev) => ({
                            ...prev,
                            businessType: e.target.value,
                          }))
                        }
                      >
                        <option value="">All Business Types</option>
                        {quoteBusinessTypeOptions.map((businessType) => (
                          <option key={businessType} value={businessType}>
                            {businessType}
                          </option>
                        ))}
                      </select>
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
                        {filteredQuotedRows.map((row, index) => (
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
                        {filteredQuotedRows.length === 0 ? (
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
                  style={{ marginTop: 24 }}
                />
                <div className="table-card" style={{ marginTop: 12 }}>
                  <div className="table-toolbar table-toolbar--filters">
                    <div className="toolbar-left">
                      <div>
                        <div className="toolbar-title">Issued Policies</div>
                        <div className="small">
                          {filteredIssuedRows.length.toLocaleString()} issued
                          policies in the selected range.
                        </div>
                      </div>
                    </div>
                    <div className="toolbar-filters">
                      <select
                        className="select table-filter"
                        value={issuedFilters.lob}
                        onChange={(e) =>
                          setIssuedFilters((prev) => ({
                            ...prev,
                            lob: e.target.value,
                          }))
                        }
                      >
                        <option value="">All LOB</option>
                        {issuedLobOptions.map((lob) => (
                          <option key={lob} value={lob}>
                            {lob}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select table-filter"
                        value={issuedFilters.policyType}
                        onChange={(e) =>
                          setIssuedFilters((prev) => ({
                            ...prev,
                            policyType: e.target.value,
                          }))
                        }
                      >
                        <option value="">All Policy Types</option>
                        {issuedPolicyTypeOptions.map((policyType) => (
                          <option key={policyType} value={policyType}>
                            {policyType}
                          </option>
                        ))}
                      </select>
                      <select
                        className="select table-filter"
                        value={issuedFilters.businessType}
                        onChange={(e) =>
                          setIssuedFilters((prev) => ({
                            ...prev,
                            businessType: e.target.value,
                          }))
                        }
                      >
                        <option value="">All Business Types</option>
                        {issuedBusinessTypeOptions.map((businessType) => (
                          <option key={businessType} value={businessType}>
                            {businessType}
                          </option>
                        ))}
                      </select>
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
                        {filteredIssuedRows.map((row, index) => {
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
                        {filteredIssuedRows.length === 0 ? (
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
