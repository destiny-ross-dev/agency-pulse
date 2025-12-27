import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { parseCsvFile, parseCsvText } from "./lib/csv";
import { SCHEMAS } from "./lib/schemas";
import { suggestMapping } from "./lib/mapping";
import { computeLeadSourceROI } from "./lib/leadSourceMetrics";
import { computeFunnel, computeFunnelByAgent } from "./lib/funnel";

import TopBar from "./components/layout/TopBar";
import DateRangeFilter from "./components/common/DateRangeFilter";
import DataImport from "./routes/DataImport";
import MapColumns from "./routes/MapColumns";
import Dashboard from "./routes/Dashboard";
import Agents from "./routes/Agents";
import { WorkflowDataProvider, useWorkflowData } from "./context/WorkflowData";

const stepPaths = {
  1: "/import-data",
  2: "/map-columns",
  3: "/dashboard",
};

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

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

  const {
    datasets,
    setDatasets,
    mappings,
    setMappings,
    allUploaded,
    canAnalyze,
    filteredRows,
    metrics,
    health,
    agentRows,
    issuedPremiumSeries,
    rangeLabel,
    resetWorkflowData,
    kpiGoals,
    setKpiGoals,
    updateGoal,
    kpiGoalsLoaded,
  } = useWorkflowData();

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
      setError(err?.message || "Failed to load demo data. Please try again.");
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
    resetWorkflowData();
    navigate(stepPaths[1]);
  }

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
      <div className="container">
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

        {step === 3 && kpiGoalsLoaded ? (
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

function AgentsRoute() {
  const { agentInsights } = useWorkflowData();
  return <Agents agentInsights={agentInsights} />;
}

export default function App() {
  return (
    <WorkflowDataProvider>
      <ScrollToTop />
      <TopBar />
      <DateRangeFilter />
      <Routes>
        <Route path="/" element={<Navigate to={stepPaths[1]} replace />} />
        <Route path="/import-data" element={<StepWorkflow step={1} />} />
        <Route path="/map-columns" element={<StepWorkflow step={2} />} />
        <Route path="/dashboard" element={<StepWorkflow step={3} />} />
        <Route path="/agents" element={<AgentsRoute />} />
        <Route path="*" element={<Navigate to={stepPaths[1]} replace />} />
      </Routes>
    </WorkflowDataProvider>
  );
}
