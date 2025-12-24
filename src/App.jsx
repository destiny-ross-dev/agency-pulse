// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";

import { SCHEMAS } from "./lib/schemas";
import { parseCsvFile } from "./lib/csv";
import { suggestMapping } from "./lib/mapping";
import { normalizeRows } from "./lib/normalize";
import { computeCoreMetrics } from "./lib/kpis";
import {
  endOfDay,
  findCoverage,
  formatYMD,
  inRange,
  makePresetRange,
  parseDateLoose,
  startOfDay,
  toInputDate,
} from "./lib/dates";
import { computeDataHealth } from "./lib/dataHealth";
import { computeAgentMetrics } from "./lib/agentMetrics";
import { computeLeadSourceROI } from "./lib/leadSourceMetrics";
import { computeFunnel, computeFunnelByAgent } from "./lib/funnel";
import FunnelDiagnostics from "./components/funnel/FunnelDiagnostics";
import DataHealthPanel from "./components/health/DataHealthPanel";
import KPIGoals from "./components/goals/KPIGoals";
import { clampNum } from "./lib/formatHelpers";

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V4M12 4L7 9M12 4L17 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12h3l2-6 4 12 2-6h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepPill({ label, active, done }) {
  const className = done ? "pill done" : active ? "pill active" : "pill";
  return <div className={className}>{label}</div>;
}

function Card({ children, pad = false }) {
  return <div className={`card ${pad ? "pad" : ""}`}>{children}</div>;
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-head">
      <div className="section-icon">{icon}</div>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function DropzoneTile({ label, hint, fileMeta, onPick }) {
  const ok = Boolean(fileMeta?.fileName);

  return (
    <button
      type="button"
      className={`dropzone ${ok ? "ok" : ""}`}
      onClick={onPick}
    >
      <div className="drop-inner">
        <div className="file-icon">
          <UploadIcon />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="drop-title">{label}</p>
          <p className="drop-hint">{hint}</p>

          <div className="badges">
            {ok ? (
              <>
                <span className="badge" title={fileMeta.fileName}>
                  {fileMeta.fileName}
                </span>
                <span className="badge">
                  {fileMeta.rowCount.toLocaleString()} rows
                </span>
                <span className="badge">{fileMeta.headers.length} columns</span>
              </>
            ) : (
              <span className="badge">Click to upload CSV</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniBusy() {
  return (
    <div className="busy">
      <span className="spinner" />
      Parsing CSV…
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select the matching CSV column…</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function money2(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ratio(n) {
  const x = Number(n || 0);
  return `${x.toFixed(2)}x`;
}

function pct(n) {
  const x = Number(n || 0);
  return `${(x * 100).toFixed(1)}%`;
}

function SegButton({ active, children, onClick }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {children}
    </button>
  );
}

function HealthItem({ label, note, count }) {
  const n = Number(count || 0);
  const cls = n > 0 ? "health-count warn" : "health-count ok";

  return (
    <div className="health-item">
      <div className="health-left">
        <div className="health-label">{label}</div>
        <div className="health-note">{note}</div>
      </div>
      <div className={cls}>{n.toLocaleString()}</div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [healthOpen, setHealthOpen] = useState(true);
  const [agentView, setAgentView] = useState("totals"); // "totals" | "efficiency"

  const [roiSort, setRoiSort] = useState("premiumPerSpend"); // premiumPerSpend | issuedPremium | cpa
  const [roiScope, setRoiScope] = useState("paid"); // "paid" | "all"

  const [funnelMode, setFunnelMode] = useState("agency"); // "agency" | "agent"
  const [selectedAgent, setSelectedAgent] = useState("");

  // KPI Goals (starting with funnel targets)
  const [kpiGoals, setKpiGoals] = useState({
    contactRateTargetPct: 10, // Dials -> Contacts
    quoteRateTargetPct: 30, // Contacts -> Quotes
    issueRateTargetPct: 35, // Quotes -> Issued
  });

  function updateGoal(key, raw) {
    // store as number (percent units)
    const next = clampNum(raw, 0, 100);
    setKpiGoals?.((prev) => ({ ...(prev || kpiGoals), [key]: next }));
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agencyPulse.kpiGoals");
      if (saved) {
        const parsed = JSON.parse(saved);
        setKpiGoals((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("agencyPulse.kpiGoals", JSON.stringify(kpiGoals));
    } catch {
      // ignore
    }
  }, [kpiGoals]);

  const [datasets, setDatasets] = useState({
    activity: null,
    quotesSales: null,
    paidLeads: null,
  });

  const [mappings, setMappings] = useState({
    activity: {},
    quotesSales: {},
    paidLeads: {},
  });

  // Date range UI state
  const [rangeMode, setRangeMode] = useState("all"); // "all" | "7d" | "30d" | "custom"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const allUploaded = Boolean(
    datasets.activity && datasets.quotesSales && datasets.paidLeads
  );

  const validation = useMemo(() => {
    const out = {};
    for (const key of Object.keys(SCHEMAS)) {
      const ds = datasets[key];
      const req = SCHEMAS[key].requiredFields;
      const map = mappings[key] || {};
      const missing = req.filter((f) => !map[f.key]);
      out[key] = { ok: Boolean(ds) && missing.length === 0, missing };
    }
    return out;
  }, [datasets, mappings]);

  const canAnalyze = Object.values(validation).every((v) => v.ok);

  async function handlePickFile(datasetKey) {
    setError("");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setBusyKey(datasetKey);

      try {
        const parsed = await parseCsvFile(file);
        const schema = SCHEMAS[datasetKey];
        const suggested = suggestMapping(parsed.headers, schema.requiredFields);

        setDatasets((prev) => ({ ...prev, [datasetKey]: parsed }));
        setMappings((prev) => ({ ...prev, [datasetKey]: suggested }));
      } catch {
        setError(`Failed to parse ${file.name}. Make sure it's a valid CSV.`);
      } finally {
        setBusyKey("");
      }
    };

    input.click();
  }

  function next() {
    setError("");
    if (step === 1 && !allUploaded) {
      setError("Upload all three CSV files to continue.");
      return;
    }
    if (step === 2 && !canAnalyze) {
      setError("Map all required fields to continue.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  const activeRange = useMemo(() => {
    if (rangeMode === "custom") {
      const s = customStart ? startOfDay(new Date(customStart)) : null;
      const e = customEnd ? endOfDay(new Date(customEnd)) : null;
      if (s && e) return { start: s, end: e };
      return null; // treat incomplete custom as all-time until user finishes
    }
    return makePresetRange(rangeMode); // null => all
  }, [rangeMode, customStart, customEnd]);

  const coverage = useMemo(() => {
    if (!canAnalyze) return null;

    // Normalize all rows (unfiltered) so coverage represents available data,
    // not the currently selected date range.
    const activityAll = normalizeRows(
      datasets.activity.rows,
      mappings.activity,
      {
        numericKeys: [
          "dials_made",
          "contacts_made",
          "households_quoted",
          "total_quotes",
          "total_sales",
        ],
      }
    );

    const quoteSalesAll = normalizeRows(
      datasets.quotesSales.rows,
      mappings.quotesSales,
      {
        numericKeys: ["written_premium", "issued_premium"],
      }
    );

    const paidLeadsAll = normalizeRows(
      datasets.paidLeads.rows,
      mappings.paidLeads,
      {
        numericKeys: ["lead_count", "lead_cost"],
      }
    );

    // Compute per-dataset coverage, then merge
    const c1 = findCoverage(activityAll, "date");
    const c2 = findCoverage(quoteSalesAll, "date");
    const c3 = findCoverage(paidLeadsAll, "date");

    const coverages = [c1, c2, c3].filter(Boolean);
    if (coverages.length === 0) return null;

    let min = coverages[0].start;
    let max = coverages[0].end;

    for (const c of coverages.slice(1)) {
      if (c.start.getTime() < min.getTime()) min = c.start;
      if (c.end.getTime() > max.getTime()) max = c.end;
    }

    return { start: min, end: max };
  }, [canAnalyze, datasets, mappings]);

  // Helper: filter normalized rows by their "date" key
  function filterByRange(rows, dateKey = "date") {
    if (!activeRange) return rows;
    const { start, end } = activeRange;
    return rows.filter((r) => {
      const d = parseDateLoose(r?.[dateKey]);
      return inRange(d, start, end);
    });
  }

  const normalizedAll = useMemo(() => {
    if (!canAnalyze) return null;

    const activityAll = normalizeRows(
      datasets.activity.rows,
      mappings.activity,
      {
        numericKeys: [
          "dials_made",
          "contacts_made",
          "households_quoted",
          "total_quotes",
          "total_sales",
        ],
      }
    );

    const quoteSalesAll = normalizeRows(
      datasets.quotesSales.rows,
      mappings.quotesSales,
      {
        numericKeys: ["written_premium", "issued_premium"],
      }
    );

    const paidLeadsAll = normalizeRows(
      datasets.paidLeads.rows,
      mappings.paidLeads,
      {
        numericKeys: ["lead_count", "lead_cost"],
      }
    );

    return { activityAll, quoteSalesAll, paidLeadsAll };
  }, [canAnalyze, datasets, mappings]);

  const metrics = useMemo(() => {
    if (step !== 3) return null;
    if (!canAnalyze || !normalizedAll) return null;

    const activityRows = filterByRange(normalizedAll.activityAll, "date");
    const quoteSalesRows = filterByRange(normalizedAll.quoteSalesAll, "date");
    const paidLeadRows = filterByRange(normalizedAll.paidLeadsAll, "date");

    return computeCoreMetrics({ activityRows, quoteSalesRows, paidLeadRows });
  }, [step, canAnalyze, normalizedAll, activeRange]);

  const health = useMemo(() => {
    if (!canAnalyze || !normalizedAll) return null;

    // Important: health is computed on the currently selected date range
    // so cross-file totals comparisons are meaningful.
    const activityRows = filterByRange(normalizedAll.activityAll, "date");
    const quoteSalesRows = filterByRange(normalizedAll.quoteSalesAll, "date");
    const paidLeadRows = filterByRange(normalizedAll.paidLeadsAll, "date");

    return computeDataHealth({
      activityRows,
      quoteSalesRows,
      paidLeadRows,
    });
  }, [canAnalyze, normalizedAll, activeRange]);

  const agentRows = useMemo(() => {
    if (step !== 3) return [];
    if (!canAnalyze || !normalizedAll) return [];

    const activityRows = filterByRange(normalizedAll.activityAll, "date");
    const quoteSalesRows = filterByRange(normalizedAll.quoteSalesAll, "date");

    return computeAgentMetrics({ activityRows, quoteSalesRows });
  }, [step, canAnalyze, normalizedAll, activeRange]);

  const rangeLabel = useMemo(() => {
    if (rangeMode === "all") return "All Time";
    if (rangeMode === "7d") return "Last 7 days";
    if (rangeMode === "30d") return "Last 30 days";
    if (rangeMode === "custom" && activeRange)
      return `${toInputDate(activeRange.start)} → ${toInputDate(
        activeRange.end
      )}`;
    if (rangeMode === "custom") return "Custom";
    return "All Time";
  }, [rangeMode, activeRange]);

  const roiRows = useMemo(() => {
    if (step !== 3) return [];
    if (!canAnalyze || !normalizedAll) return [];

    const quoteSalesRows = filterByRange(normalizedAll.quoteSalesAll, "date");
    const paidLeadRows = filterByRange(normalizedAll.paidLeadsAll, "date");

    let rows = computeLeadSourceROI({ quoteSalesRows, paidLeadRows });

    // Scope filter:
    // - "paid": only sources with paid lead activity (leads > 0 OR spend > 0)
    // - "all": keep everything
    if (roiScope === "paid") {
      rows = rows.filter((r) => (r.leads || 0) > 0 || (r.spend || 0) > 0);
    }

    if (roiSort === "issuedPremium") {
      return [...rows].sort((a, b) => b.issuedPremium - a.issuedPremium);
    }

    if (roiSort === "cpa") {
      // lower CPA is better; push zeros (no issued) to bottom
      return [...rows].sort((a, b) => {
        const aa = a.cpa === 0 ? Number.POSITIVE_INFINITY : a.cpa;
        const bb = b.cpa === 0 ? Number.POSITIVE_INFINITY : b.cpa;
        return aa - bb;
      });
    }

    // default: premiumPerSpend (higher is better); push zeros to bottom
    return [...rows].sort((a, b) => {
      const aa = a.premiumPerSpend === 0 ? -1 : a.premiumPerSpend;
      const bb = b.premiumPerSpend === 0 ? -1 : b.premiumPerSpend;
      return bb - aa;
    });
  }, [step, canAnalyze, normalizedAll, activeRange, roiSort, roiScope]);

  const funnelData = useMemo(() => {
    if (step !== 3) return null;
    if (!canAnalyze || !normalizedAll) return null;

    const activityRows = filterByRange(normalizedAll.activityAll, "date");
    const quoteSalesRows = filterByRange(normalizedAll.quoteSalesAll, "date");

    const agency = computeFunnel({ activityRows, quoteSalesRows });
    const byAgent = computeFunnelByAgent({ activityRows, quoteSalesRows });

    const agents = Array.from(byAgent.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    // Keep selection stable; pick first agent if none selected
    const agentName =
      selectedAgent && byAgent.has(selectedAgent)
        ? selectedAgent
        : agents[0] || "";
    const agentFunnel = agentName ? byAgent.get(agentName) : null;

    return { agency, byAgent, agents, agentName, agentFunnel };
  }, [step, canAnalyze, normalizedAll, activeRange, selectedAgent]);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-logo">
              <PulseIcon />
            </div>
            <div className="brand-title">AgencyPulse</div>
          </div>

          <div className="user">
            <div className="user-text">Welcome back</div>
            <div className="avatar" />
          </div>
        </div>
      </div>

      <div className="container">
        <h1 className="page-title">Performance Overview</h1>
        <p className="page-subtitle">
          Upload your data, map columns, and generate sales insights for your
          agency.
        </p>

        <div className="stepper">
          <StepPill
            label="1. Data Import"
            active={step === 1}
            done={step > 1}
          />
          <StepPill
            label="2. Column Mapping"
            active={step === 2}
            done={step > 2}
          />
          <StepPill label="3. Analyze" active={step === 3} done={false} />
        </div>

        {error ? <div className="alert">{error}</div> : null}

        {step === 1 ? (
          <Card pad>
            <SectionTitle
              icon={<UploadIcon />}
              title="Data Import"
              subtitle="Upload your CSV exports to update the dashboard."
            />

            <div className="grid-3">
              <div>
                <p className="label">Activity Tracker</p>
                <DropzoneTile
                  label="Upload Activity CSV"
                  hint="Daily totals per agent (dials, contacts, quotes, sales)."
                  fileMeta={datasets.activity}
                  onPick={() => handlePickFile("activity")}
                />
                {busyKey === "activity" ? <MiniBusy /> : null}
              </div>

              <div>
                <p className="label">Quotes & Sales Log</p>
                <DropzoneTile
                  label="Upload Quotes & Sales CSV"
                  hint="One row per policy quote / issued policy."
                  fileMeta={datasets.quotesSales}
                  onPick={() => handlePickFile("quotesSales")}
                />
                {busyKey === "quotesSales" ? <MiniBusy /> : null}
              </div>

              <div>
                <p className="label">Paid Leads Info</p>
                <DropzoneTile
                  label="Upload Paid Leads CSV"
                  hint="Daily lead counts & cost for paid sources."
                  fileMeta={datasets.paidLeads}
                  onPick={() => handlePickFile("paidLeads")}
                />
                {busyKey === "paidLeads" ? <MiniBusy /> : null}
              </div>
            </div>

            <div className="actions">
              <button
                className="btn primary"
                disabled={!allUploaded}
                onClick={next}
              >
                Continue to Mapping
              </button>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
            {Object.keys(SCHEMAS).map((key) => {
              const schema = SCHEMAS[key];
              const ds = datasets[key];
              if (!ds) return null;

              return (
                <Card key={key} pad>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                        {schema.label}
                      </h3>
                      <p
                        style={{
                          margin: "6px 0 0",
                          color: "var(--muted)",
                          fontSize: 13,
                        }}
                      >
                        {schema.description} •{" "}
                        <b style={{ color: "#334155" }}>{ds.fileName}</b>
                      </p>
                    </div>

                    <div>
                      <button
                        className="btn"
                        onClick={() => handlePickFile(key)}
                      >
                        Re-upload
                      </button>
                    </div>
                  </div>

                  <div className="mapping-table">
                    <div className="mapping-header">
                      <div>Required Field</div>
                      <div>CSV Column</div>
                    </div>

                    {schema.requiredFields.map((f) => {
                      const current = mappings[key]?.[f.key] ?? "";
                      const missing = !current;

                      return (
                        <div key={f.key} className="mapping-row">
                          <div className="field">
                            <div className="field-name">{f.label}</div>
                            {missing ? (
                              <span className="chip bad">Required</span>
                            ) : (
                              <span className="chip ok">Mapped</span>
                            )}
                          </div>
                          <Select
                            value={current}
                            onChange={(val) =>
                              setMappings((prev) => ({
                                ...prev,
                                [key]: { ...(prev[key] || {}), [f.key]: val },
                              }))
                            }
                            options={ds.headers}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="preview">
                    <p className="preview-title">Preview</p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {ds.headers.slice(0, 6).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ds.previewRows.map((r, idx) => (
                            <tr key={idx}>
                              {ds.headers.slice(0, 6).map((h) => (
                                <td key={h}>{String(r?.[h] ?? "")}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              );
            })}

            <div
              className="actions"
              style={{ justifyContent: "space-between" }}
            >
              <button className="btn" onClick={back}>
                Back
              </button>
              <button
                className="btn primary"
                disabled={!canAnalyze}
                onClick={next}
              >
                Continue to Analyze
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
            <Card pad>
              <SectionTitle
                icon={<PulseIcon />}
                title="Core Metrics"
                subtitle="Computed from the mapped files (now filterable by date range)."
              />

              {/* Date range filter bar */}
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

              {/* Data Health & Integrity Panel */}
              {/* {health ? (
                <div className="health">
                  <div className="health-head">
                    <div>
                      <p className="health-title">
                        Data Health &amp; Integrity
                      </p>
                      <p className="health-sub">
                        Quick checks to catch missing fields, invalid dates, and
                        mismatched paid sources.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="collapse-btn"
                      onClick={() => setHealthOpen((v) => !v)}
                      aria-expanded={healthOpen}
                      aria-controls="data-health-content"
                    >
                      <span>{healthOpen ? "Collapse" : "Expand"}</span>
                      <svg
                        className={`chev ${healthOpen ? "open" : ""}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {healthOpen ? (
                    <div id="data-health-content">
                      <div className="health-grid">
                        <div className="health-card">
                          <h4>Activity</h4>
                          <div className="health-list">
                            <HealthItem
                              label="Rows missing Date"
                              note="These rows won’t be usable in date-based reporting."
                              count={health.activity.missingDate}
                            />
                            <HealthItem
                              label="Rows missing Agent Name"
                              note="Agent rollups may be incomplete."
                              count={health.activity.missingAgent}
                            />
                            <HealthItem
                              label="Cross-file totals mismatch (Quotes + Issued)"
                              note={`Activity Total Quotes: ${Math.round(
                                health.cross.activityQuotesTotal
                              ).toLocaleString()} • Log (Quoted+Issued): ${health.cross.logQuotedOrIssued.toLocaleString()} • Δ ${Math.round(
                                health.cross.quotesDelta
                              ).toLocaleString()}`}
                              count={Math.abs(health.cross.quotesDelta)}
                            />
                            <HealthItem
                              label="Cross-file totals mismatch (Issued)"
                              note={`Activity Total Sales: ${Math.round(
                                health.cross.activitySalesTotal
                              ).toLocaleString()} • Log Issued: ${health.cross.logIssued.toLocaleString()} • Δ ${Math.round(
                                health.cross.salesDelta
                              ).toLocaleString()}`}
                              count={Math.abs(health.cross.salesDelta)}
                            />
                            <HealthItem
                              label="Non-numeric activity counts"
                              note="Examples: 'ten', 'N/A', or formatted text."
                              count={health.activity.nonNumericCounts}
                            />
                            <HealthItem
                              label="Negative activity counts"
                              note="Usually indicates data entry error."
                              count={health.activity.negativeCounts}
                            />
                          </div>
                        </div>

                        <div className="health-card">
                          <h4>Quotes &amp; Sales</h4>
                          <div className="health-list">
                            <HealthItem
                              label="Rows missing Date"
                              note="These rows won’t be included in trends."
                              count={health.quotesSales.missingDate}
                            />
                            <HealthItem
                              label="Missing or invalid Status"
                              note="Status should be Quoted or Issued for MVP."
                              count={
                                health.quotesSales.missingStatus +
                                health.quotesSales.badStatus
                              }
                            />
                            <HealthItem
                              label="Issued missing Issue Date"
                              note="Issued policies should include a valid Issue Date."
                              count={health.quotesSales.issuedMissingIssueDate}
                            />
                            <HealthItem
                              label="Issued missing Issued Premium"
                              note="Totals may be understated."
                              count={
                                health.quotesSales.issuedMissingIssuedPremium
                              }
                            />
                            <HealthItem
                              label="Missing Lead Source"
                              note="Lead source ROI will be incomplete."
                              count={health.quotesSales.missingLeadSource}
                            />
                          </div>
                        </div>

                        <div className="health-card">
                          <h4>Paid Leads</h4>
                          <div className="health-list">
                            <HealthItem
                              label="Rows missing Date"
                              note="Spend allocation by date may be off."
                              count={health.paidLeads.missingDate}
                            />
                            <HealthItem
                              label="Missing Lead Count or Cost"
                              note="CPA and spend totals may be wrong."
                              count={
                                health.paidLeads.missingLeadCount +
                                health.paidLeads.missingLeadCost
                              }
                            />
                            <HealthItem
                              label="Non-numeric Count/Cost"
                              note="Examples: '$12' is OK, but 'twelve' is not."
                              count={health.paidLeads.nonNumeric}
                            />
                            <HealthItem
                              label="Paid sources not seen in Quotes/Sales"
                              note="Provider names may not match between files."
                              count={health.cross.paidSourcesWithNoQuoteSales}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null} */}
              <DataHealthPanel
                health={health}
                open={healthOpen}
                onToggle={() => setHealthOpen((v) => !v)}
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
                  <div className="kpi-hint">
                    Count of rows where Status = Issued.
                  </div>
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
                  <div className="kpi-hint">
                    Paid spend / Issued policies (MVP).
                  </div>
                </div>
              </div>

              {/* Agent Comparison */}
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
                      {agentRows.map((a) => (
                        <tr key={a.agent}>
                          <td style={{ fontWeight: 900 }}>{a.agent}</td>

                          {agentView === "totals" ? (
                            <>
                              <td className="right">
                                {money(a.issuedPremium)}
                              </td>
                              <td className="right">
                                {a.issued.toLocaleString()}
                              </td>
                              <td className="right">
                                {a.quotes.toLocaleString()}
                              </td>
                              <td className="right">
                                {a.dials.toLocaleString()}
                              </td>
                              <td className="right">
                                {a.contacts.toLocaleString()}
                              </td>
                              <td className="right">{pct(a.contactRate)}</td>
                              <td className="right">{pct(a.conversionRate)}</td>
                            </>
                          ) : (
                            <>
                              <td className="right">
                                {a.issuedPer100Dials.toFixed(1)}
                              </td>
                              <td className="right">
                                {a.quotesPer100Dials.toFixed(1)}
                              </td>
                              <td className="right">
                                {money(a.issuedPremPerDial)}
                              </td>
                              <td className="right">
                                {money(a.issuedPremPerContact)}
                              </td>
                              <td className="right">{pct(a.contactRate)}</td>
                              <td className="right">
                                {money(a.issuedPremPerIssued)}
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

              {/* Funnel Diagnostics */}
              <FunnelDiagnostics
                funnelData={funnelData}
                funnelMode={funnelMode}
                setFunnelMode={setFunnelMode}
                selectedAgent={selectedAgent}
                setSelectedAgent={setSelectedAgent}
                goals={kpiGoals}
                setKpiGoals={setKpiGoals}
              />

              {/* Lead Source ROI */}
              <div className="table-card" style={{ marginTop: 16 }}>
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div>
                      <div className="toolbar-title">Lead Source ROI</div>
                      <div className="small">
                        Spend, volume, and outcomes by lead source
                        (date-filtered).
                      </div>
                    </div>

                    <div className="seg" style={{ marginLeft: 6 }}>
                      <button
                        type="button"
                        className={
                          roiSort === "premiumPerSpend" ? "active" : ""
                        }
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
                      {roiRows.map((r) => (
                        <tr key={r.leadSource}>
                          <td style={{ fontWeight: 900 }}>{r.leadSource}</td>
                          <td className="right">{r.leads.toLocaleString()}</td>
                          <td className="right">{money2(r.spend)}</td>
                          <td className="right">{money2(r.spendPerLead)}</td>
                          <td className="right">{r.quoted.toLocaleString()}</td>
                          <td className="right">{r.issued.toLocaleString()}</td>
                          <td className="right">{pct(r.conversion)}</td>
                          <td className="right">
                            {r.cpa ? money2(r.cpa) : "—"}
                          </td>
                          <td className="right">{money(r.issuedPremium)}</td>
                          <td className="right">
                            {r.premiumPerSpend ? ratio(r.premiumPerSpend) : "—"}
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

              <div
                className="actions"
                style={{ justifyContent: "space-between" }}
              >
                <button className="btn" onClick={back}>
                  Back
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setStep(1);
                    setError("");
                    setBusyKey("");
                    setDatasets({
                      activity: null,
                      quotesSales: null,
                      paidLeads: null,
                    });
                    setMappings({
                      activity: {},
                      quotesSales: {},
                      paidLeads: {},
                    });
                    setRangeMode("all");
                    setCustomStart("");
                    setCustomEnd("");
                    // keep KPI goals persisted unless you want to reset them too
                  }}
                >
                  Start Over
                </button>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
