import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { SCHEMAS } from "../lib/schemas";
import { normalizeRows } from "../lib/normalize";
import { computeCoreMetrics } from "../lib/kpis";
import { computeDataHealth } from "../lib/dataHealth";
import { computeAgentInsights, computeAgentMetrics } from "../lib/agentMetrics";
import { computeIssuedPremiumSeries } from "../lib/issuedPremiumSeries";
import { clampNum } from "../lib/formatHelpers";
import {
  endOfDay,
  findCoverage,
  inRange,
  makePresetRange,
  parseDateLoose,
  startOfDay,
  toInputDate,
} from "../lib/dates";

const WorkflowDataContext = createContext(null);
const DEFAULT_KPI_GOALS = {
  contactRateTargetPct: 10,
  quoteRateTargetPct: 30,
  issueRateTargetPct: 35,
  callsPerDayTarget: 150,
  householdsQuotedPerDayTarget: 6,
};

const GOAL_LIMITS = {
  contactRateTargetPct: { min: 0, max: 100 },
  quoteRateTargetPct: { min: 0, max: 100 },
  issueRateTargetPct: { min: 0, max: 100 },
  callsPerDayTarget: { min: 0, max: Number.POSITIVE_INFINITY },
  householdsQuotedPerDayTarget: { min: 0, max: Number.POSITIVE_INFINITY },
};

export function WorkflowDataProvider({ children }) {
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
  const [kpiGoals, setKpiGoals] = useState(null);
  const [kpiGoalsLoaded, setKpiGoalsLoaded] = useState(false);

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

  const canAnalyze = useMemo(
    () => Object.values(validation).every((v) => v.ok),
    [validation]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agencyPulse.kpiGoals");
      if (saved) {
        const parsed = JSON.parse(saved);
        setKpiGoals({ ...DEFAULT_KPI_GOALS, ...parsed });
        setKpiGoalsLoaded(true);
        return;
      }
    } catch {
      // ignore
    }
    setKpiGoals({ ...DEFAULT_KPI_GOALS });
    setKpiGoalsLoaded(true);
  }, []);

  useEffect(() => {
    if (!kpiGoalsLoaded || !kpiGoals) return;
    try {
      localStorage.setItem("agencyPulse.kpiGoals", JSON.stringify(kpiGoals));
    } catch {
      // ignore
    }
  }, [kpiGoals, kpiGoalsLoaded]);

  function updateGoal(key, raw) {
    const limits = GOAL_LIMITS[key] || {
      min: 0,
      max: Number.POSITIVE_INFINITY,
    };
    const next = clampNum(raw, limits.min, limits.max);
    setKpiGoals((prev) => ({ ...(prev || DEFAULT_KPI_GOALS), [key]: next }));
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
    if (!filteredRows) return null;

    return computeCoreMetrics(filteredRows);
  }, [filteredRows]);

  const health = useMemo(() => {
    if (!filteredRows) return null;

    return computeDataHealth(filteredRows);
  }, [filteredRows]);

  const agentRows = useMemo(() => {
    if (!filteredRows) return [];

    return computeAgentMetrics({
      activityRows: filteredRows.activityRows,
      quoteSalesRows: filteredRows.quoteSalesRows,
    });
  }, [filteredRows]);

  const allAgentRows = useMemo(() => {
    if (!normalizedAll) return [];

    return computeAgentMetrics({
      activityRows: normalizedAll.activityAll,
      quoteSalesRows: normalizedAll.quoteSalesAll,
    });
  }, [normalizedAll]);

  const agentInsights = useMemo(() => {
    if (!filteredRows) return { byAgent: {}, thresholds: {} };

    return computeAgentInsights({
      activityRows: filteredRows.activityRows,
      quoteSalesRows: filteredRows.quoteSalesRows,
    });
  }, [filteredRows]);

  const issuedPremiumSeries = useMemo(() => {
    if (!filteredRows) return { buckets: [], agents: [], granularity: "month" };

    return computeIssuedPremiumSeries({
      quoteSalesRows: filteredRows.quoteSalesRows,
      rangeMode,
      activeRange,
    });
  }, [filteredRows, activeRange, rangeMode]);

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

  function resetWorkflowData() {
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
  }

  const value = {
    datasets,
    setDatasets,
    mappings,
    setMappings,
    allUploaded,
    validation,
    canAnalyze,
    rangeMode,
    setRangeMode,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    activeRange,
    coverage,
    filteredRows,
    metrics,
    health,
    agentRows,
    allAgentRows,
    agentInsights,
    issuedPremiumSeries,
    rangeLabel,
    resetWorkflowData,
    kpiGoals,
    setKpiGoals,
    kpiGoalsLoaded,
    updateGoal,
  };

  return (
    <WorkflowDataContext.Provider value={value}>
      {children}
    </WorkflowDataContext.Provider>
  );
}

export function useWorkflowData() {
  const context = useContext(WorkflowDataContext);
  if (!context) {
    throw new Error("useWorkflowData must be used within WorkflowDataProvider");
  }
  return context;
}
