import { useCallback, useEffect, useMemo, useState } from "react";

import { SCHEMAS } from "../lib/schemas";
import { normalizeRows } from "../lib/normalize";
import { computeCoreMetrics } from "../lib/kpis";
import { computeDataHealth } from "../lib/dataHealth";
import { computeAgentInsights, computeAgentMetrics } from "../lib/agentMetrics";
import {
  computeIssuedCountSeries,
  computeIssuedPremiumSeries,
} from "../lib/issuedPremiumSeries";
import { clampNum, formatReadableDate } from "../lib/formatHelpers";
import {
  endOfDay,
  findCoverage,
  inRange,
  makePresetRange,
  parseInputDate,
  parseDateLoose,
  startOfDay,
} from "../lib/dates";
import { WorkflowDataContext } from "./WorkflowDataContext";

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

const EMPTY_AGENT_QUOTE_SALES = {
  baseRows: [],
  quotedRows: [],
  issuedRows: [],
  quoteLobOptions: [],
  quotePolicyTypeOptions: [],
  quoteBusinessTypeOptions: [],
  issuedLobOptions: [],
  issuedPolicyTypeOptions: [],
  issuedBusinessTypeOptions: [],
};

function collectOptions(rows, key) {
  const values = new Set();
  rows.forEach((row) => {
    const value = String(row?.[key] || "").trim();
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
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
  const [kpiGoals, setKpiGoals] = useState(() => {
    try {
      const saved = localStorage.getItem("agencyPulse.kpiGoals");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_KPI_GOALS, ...parsed };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_KPI_GOALS };
  });

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
    if (!kpiGoals) return;
    try {
      localStorage.setItem("agencyPulse.kpiGoals", JSON.stringify(kpiGoals));
    } catch {
      // ignore
    }
  }, [kpiGoals]);

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
      const startDate = customStart ? parseInputDate(customStart) : null;
      const endDate = customEnd ? parseInputDate(customEnd) : null;
      const s = startDate ? startOfDay(startDate) : null;
      const e = endDate ? endOfDay(endDate) : null;
      if (s && e) return { start: s, end: e };
      return null;
    }
    return makePresetRange(rangeMode);
  }, [rangeMode, customStart, customEnd]);

  const filterByRange = useCallback(
    (rows, dateKey = "date") => {
      if (!activeRange) return rows;
      const { start, end } = activeRange;
      return rows.filter((r) => {
        const d = parseDateLoose(r?.[dateKey]);
        return inRange(d, start, end);
      });
    },
    [activeRange]
  );

  const filterQuoteSalesByRange = useCallback(
    (rows) => {
      if (!activeRange) return rows;
      const { start, end } = activeRange;
      return rows.filter((row) => {
        const d = parseDateLoose(getQuoteSalesDate(row));
        return inRange(d, start, end);
      });
    },
    [activeRange]
  );

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
      quoteSalesQuotedRows: filterByRange(normalizedAll.quoteSalesAll, "date"),
      paidLeadRows: filterByRange(normalizedAll.paidLeadsAll, "date"),
    };
  }, [canAnalyze, filterByRange, filterQuoteSalesByRange, normalizedAll]);

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

  const issuedPolicySeries = useMemo(() => {
    if (!filteredRows) return { buckets: [], agents: [], granularity: "month" };

    return computeIssuedCountSeries({
      quoteSalesRows: filteredRows.quoteSalesRows,
      rangeMode,
      activeRange,
    });
  }, [filteredRows, activeRange, rangeMode]);

  const agentQuoteSalesViews = useMemo(() => {
    if (!filteredRows?.quoteSalesRows) return new Map();
    const map = new Map();

    for (const row of filteredRows.quoteSalesRows) {
      const agentName =
        String(row?.agent_name || "Unknown").trim() || "Unknown";
      if (!map.has(agentName)) {
        map.set(agentName, {
          baseRows: [],
          quotedRows: [],
          issuedRows: [],
          quoteLobOptions: new Set(),
          quotePolicyTypeOptions: new Set(),
          quoteBusinessTypeOptions: new Set(),
          issuedLobOptions: new Set(),
          issuedPolicyTypeOptions: new Set(),
          issuedBusinessTypeOptions: new Set(),
        });
      }
      const entry = map.get(agentName);
      entry.baseRows.push(row);

      const status = String(row?.status || "").trim().toLowerCase();
      if (status === "quoted") {
        entry.quotedRows.push(row);
        if (row?.line_of_business)
          entry.quoteLobOptions.add(String(row.line_of_business).trim());
        if (row?.policy_type)
          entry.quotePolicyTypeOptions.add(String(row.policy_type).trim());
        if (row?.business_type)
          entry.quoteBusinessTypeOptions.add(String(row.business_type).trim());
      } else if (status === "issued") {
        entry.issuedRows.push(row);
        if (row?.line_of_business)
          entry.issuedLobOptions.add(String(row.line_of_business).trim());
        if (row?.policy_type)
          entry.issuedPolicyTypeOptions.add(String(row.policy_type).trim());
        if (row?.business_type)
          entry.issuedBusinessTypeOptions.add(String(row.business_type).trim());
      }
    }

    for (const [agentName, entry] of map.entries()) {
      map.set(agentName, {
        baseRows: entry.baseRows,
        quotedRows: entry.quotedRows,
        issuedRows: entry.issuedRows,
        quoteLobOptions: collectOptions(entry.quotedRows, "line_of_business"),
        quotePolicyTypeOptions: collectOptions(entry.quotedRows, "policy_type"),
        quoteBusinessTypeOptions: collectOptions(
          entry.quotedRows,
          "business_type"
        ),
        issuedLobOptions: collectOptions(entry.issuedRows, "line_of_business"),
        issuedPolicyTypeOptions: collectOptions(entry.issuedRows, "policy_type"),
        issuedBusinessTypeOptions: collectOptions(
          entry.issuedRows,
          "business_type"
        ),
      });
    }

    return map;
  }, [filteredRows]);

  const getAgentQuoteSales = useCallback(
    (agentName) => {
      if (!agentName) return EMPTY_AGENT_QUOTE_SALES;
      return agentQuoteSalesViews.get(agentName) || EMPTY_AGENT_QUOTE_SALES;
    },
    [agentQuoteSalesViews]
  );

  const rangeLabel = useMemo(() => {
    if (rangeMode === "all") return "All Time";
    if (rangeMode === "7d") return "Last 7 days";
    if (rangeMode === "30d") return "Last 30 days";
    if (rangeMode === "90d") return "Last 90 days";
    if (rangeMode === "365d") return "Last year";
    if (rangeMode === "custom" && activeRange)
      return `${formatReadableDate(activeRange.start)} → ${formatReadableDate(
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
    issuedPolicySeries,
    getAgentQuoteSales,
    rangeLabel,
    resetWorkflowData,
    kpiGoals,
    setKpiGoals,
    updateGoal,
  };

  return (
    <WorkflowDataContext.Provider value={value}>
      {children}
    </WorkflowDataContext.Provider>
  );
}
