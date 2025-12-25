import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";

import { SCHEMAS } from "./lib/schemas";
import { parseCsvFile, parseCsvText } from "./lib/csv";
import { suggestMapping } from "./lib/mapping";
import { normalizeRows } from "./lib/normalize";
import { computeCoreMetrics } from "./lib/kpis";
import {
  endOfDay,
  findCoverage,
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
import { clampNum } from "./lib/formatHelpers";
import { computeIssuedPremiumSeries } from "./lib/issuedPremiumSeries";

import Stepper from "./components/common/Stepper";
import TopBar from "./components/layout/TopBar";
import PageHeader from "./components/layout/PageHeader";
import DataImport from "./routes/DataImport";
import MapColumns from "./routes/MapColumns";
import Dashboard from "./routes/Dashboard";

const stepPaths = {
  1: "/import-data",
  2: "/map-columns",
  3: "/dashboard",
};

const DEMO_FILES = {
  activity: {
    url: new URL("./data/activity-tracker.csv", import.meta.url).href,
    fileName: "activity-tracker.csv",
  },
  quotesSales: {
    url: new URL("./data/quotes-and-sales-log.csv", import.meta.url).href,
    fileName: "quotes-and-sales-log.csv",
  },
  paidLeads: {
    url: new URL("./data/lead-source-info.csv", import.meta.url).href,
    fileName: "lead-source-info.csv",
  },
};

function StepWorkflow({ step }) {
  const navigate = useNavigate();
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [healthOpen, setHealthOpen] = useState(true);
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [agentView, setAgentView] = useState("totals");

  const [roiSort, setRoiSort] = useState("premiumPerSpend");
  const [roiScope, setRoiScope] = useState("paid");

  const [funnelMode, setFunnelMode] = useState("agency");
  const [selectedAgent, setSelectedAgent] = useState("");

  const [kpiGoals, setKpiGoals] = useState({
    contactRateTargetPct: 10,
    quoteRateTargetPct: 30,
    issueRateTargetPct: 35,
  });

  function updateGoal(key, raw) {
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

  const [rangeMode, setRangeMode] = useState("all");
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

  async function handleLoadDemo() {
    setError("");
    try {
      for (const datasetKey of Object.keys(DEMO_FILES)) {
        setBusyKey(datasetKey);
        const { url, fileName } = DEMO_FILES[datasetKey];
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load ${fileName}`);
        }
        const text = await response.text();
        const parsed = await parseCsvText(text, fileName);
        const schema = SCHEMAS[datasetKey];
        const suggested = suggestMapping(parsed.headers, schema.requiredFields);
        setDatasets((prev) => ({ ...prev, [datasetKey]: parsed }));
        setMappings((prev) => ({ ...prev, [datasetKey]: suggested }));
      }
    } catch (err) {
      setError(
        err?.message || "Failed to load demo data. Please try again."
      );
    } finally {
      setBusyKey("");
    }
  }

  function handleMappingChange(datasetKey, fieldKey, value) {
    setMappings((prev) => ({
      ...prev,
      [datasetKey]: { ...(prev[datasetKey] || {}), [fieldKey]: value },
    }));
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
    const nextStep = Math.min(3, step + 1);
    navigate(stepPaths[nextStep]);
  }

  function back() {
    setError("");
    const nextStep = Math.max(1, step - 1);
    navigate(stepPaths[nextStep]);
  }

  function resetWorkflow() {
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
    navigate(stepPaths[1]);
  }

  const activeRange = useMemo(() => {
    if (rangeMode === "custom") {
      const s = customStart ? startOfDay(new Date(customStart)) : null;
      const e = customEnd ? endOfDay(new Date(customEnd)) : null;
      if (s && e) return { start: s, end: e };
      return null;
    }
    return makePresetRange(rangeMode);
  }, [rangeMode, customStart, customEnd]);

  const coverage = useMemo(() => {
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

  function filterByRange(rows, dateKey = "date") {
    if (!activeRange) return rows;
    const { start, end } = activeRange;
    return rows.filter((r) => {
      const d = parseDateLoose(r?.[dateKey]);
      return inRange(d, start, end);
    });
  }

  function getQuoteSalesDate(row) {
    const status = String(row?.status || "")
      .trim()
      .toLowerCase();
    if (status === "issued") {
      return row?.date_issued || row?.date;
    }
    return row?.date;
  }

  function filterQuoteSalesByRange(rows) {
    if (!activeRange) return rows;
    const { start, end } = activeRange;
    return rows.filter((row) => {
      const d = parseDateLoose(getQuoteSalesDate(row));
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

  const filteredRows = useMemo(() => {
    if (!canAnalyze || !normalizedAll) return null;

    return {
      activityRows: filterByRange(normalizedAll.activityAll, "date"),
      quoteSalesRows: filterQuoteSalesByRange(normalizedAll.quoteSalesAll),
      paidLeadRows: filterByRange(normalizedAll.paidLeadsAll, "date"),
    };
  }, [canAnalyze, normalizedAll, activeRange]);

  const metrics = useMemo(() => {
    if (step !== 3) return null;
    if (!filteredRows) return null;

    return computeCoreMetrics(filteredRows);
  }, [step, filteredRows]);

  const health = useMemo(() => {
    if (!filteredRows) return null;

    return computeDataHealth(filteredRows);
  }, [filteredRows]);

  const agentRows = useMemo(() => {
    if (step !== 3) return [];
    if (!filteredRows) return [];

    return computeAgentMetrics({
      activityRows: filteredRows.activityRows,
      quoteSalesRows: filteredRows.quoteSalesRows,
    });
  }, [step, filteredRows]);

  const issuedPremiumSeries = useMemo(() => {
    if (step !== 3) return { buckets: [], agents: [], granularity: "month" };
    if (!filteredRows) return { buckets: [], agents: [], granularity: "month" };

    return computeIssuedPremiumSeries({
      quoteSalesRows: filteredRows.quoteSalesRows,
      rangeMode,
      activeRange,
    });
  }, [step, filteredRows, activeRange, rangeMode]);

  const rangeLabel = useMemo(() => {
    if (rangeMode === "all") return "All Time";
    if (rangeMode === "7d") return "Last 7 days";
    if (rangeMode === "30d") return "Last 30 days";
    if (rangeMode === "90d") return "Last 90 days";
    if (rangeMode === "365d") return "Last year";
    if (rangeMode === "custom" && activeRange)
      return `${toInputDate(activeRange.start)} → ${toInputDate(
        activeRange.end
      )}`;
    if (rangeMode === "custom") return "Custom";
    return "All Time";
  }, [rangeMode, activeRange]);

  const roiRows = useMemo(() => {
    if (step !== 3) return [];
    if (!filteredRows) return [];

    let rows = computeLeadSourceROI({
      quoteSalesRows: filteredRows.quoteSalesRows,
      paidLeadRows: filteredRows.paidLeadRows,
    });

    if (roiScope === "paid") {
      rows = rows.filter((r) => (r.leads || 0) > 0 || (r.spend || 0) > 0);
    }

    if (roiSort === "issuedPremium") {
      return [...rows].sort((a, b) => b.issuedPremium - a.issuedPremium);
    }

    if (roiSort === "cpa") {
      return [...rows].sort((a, b) => {
        const aa = a.cpa === 0 ? Number.POSITIVE_INFINITY : a.cpa;
        const bb = b.cpa === 0 ? Number.POSITIVE_INFINITY : b.cpa;
        return aa - bb;
      });
    }

    return [...rows].sort((a, b) => {
      const aa = a.premiumPerSpend === 0 ? -1 : a.premiumPerSpend;
      const bb = b.premiumPerSpend === 0 ? -1 : b.premiumPerSpend;
      return bb - aa;
    });
  }, [step, filteredRows, roiSort, roiScope]);

  const funnelData = useMemo(() => {
    if (step !== 3) return null;
    if (!filteredRows) return null;

    const agency = computeFunnel({
      activityRows: filteredRows.activityRows,
      quoteSalesRows: filteredRows.quoteSalesRows,
    });
    const byAgent = computeFunnelByAgent({
      activityRows: filteredRows.activityRows,
      quoteSalesRows: filteredRows.quoteSalesRows,
    });

    const agents = Array.from(byAgent.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    const agentName =
      selectedAgent && byAgent.has(selectedAgent)
        ? selectedAgent
        : agents[0] || "";
    const agentFunnel = agentName ? byAgent.get(agentName) : null;

    return { agency, byAgent, agents, agentName, agentFunnel };
  }, [step, filteredRows, selectedAgent]);

  useEffect(() => {
    if (step === 2 && !allUploaded) {
      setError("Upload all three CSV files to continue.");
      navigate(stepPaths[1], { replace: true });
      return;
    }
    if (step === 3 && !canAnalyze) {
      setError("Map all required fields to continue.");
      navigate(stepPaths[2], { replace: true });
    }
  }, [step, allUploaded, canAnalyze, navigate]);

  return (
    <div>
      <TopBar />

      <div className="container">
        <PageHeader
          title="Performance Overview"
          subtitle="Upload your data, map columns, and generate sales insights for your agency."
        />

        <Stepper step={step} />

        {error ? <div className="alert">{error}</div> : null}

        {step === 1 ? (
          <DataImport
            datasets={datasets}
            busyKey={busyKey}
            allUploaded={allUploaded}
            onPickFile={handlePickFile}
            onLoadDemo={handleLoadDemo}
            onNext={next}
          />
        ) : null}

        {step === 2 ? (
          <MapColumns
            datasets={datasets}
            mappings={mappings}
            onMappingChange={handleMappingChange}
            onReupload={handlePickFile}
            onBack={back}
            onNext={next}
            canAnalyze={canAnalyze}
          />
        ) : null}

        {step === 3 ? (
          <Dashboard
            metrics={metrics}
            health={health}
            healthOpen={healthOpen}
            onToggleHealth={() => setHealthOpen((v) => !v)}
            goalsOpen={goalsOpen}
            onToggleGoals={() => setGoalsOpen((v) => !v)}
            kpiGoals={kpiGoals}
            updateGoal={updateGoal}
            agentRows={agentRows}
            agentView={agentView}
            setAgentView={setAgentView}
            issuedPremiumSeries={issuedPremiumSeries}
            rangeMode={rangeMode}
            setRangeMode={setRangeMode}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            coverage={coverage}
            rangeLabel={rangeLabel}
            funnelData={funnelData}
            funnelMode={funnelMode}
            setFunnelMode={setFunnelMode}
            selectedAgent={selectedAgent}
            setSelectedAgent={setSelectedAgent}
            setKpiGoals={setKpiGoals}
            roiRows={roiRows}
            roiSort={roiSort}
            setRoiSort={setRoiSort}
            roiScope={roiScope}
            setRoiScope={setRoiScope}
            onBack={back}
            onStartOver={resetWorkflow}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={stepPaths[1]} replace />} />
      <Route path="/import-data" element={<StepWorkflow step={1} />} />
      <Route path="/map-columns" element={<StepWorkflow step={2} />} />
      <Route path="/dashboard" element={<StepWorkflow step={3} />} />
      <Route path="*" element={<Navigate to={stepPaths[1]} replace />} />
    </Routes>
  );
}
