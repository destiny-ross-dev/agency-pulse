import { formatYMD, inRange, parseDateLoose, startOfDay } from "./dates";

const MS_DAY = 24 * 60 * 60 * 1000;

function lower(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function daysBetween(start, end) {
  const startDay = startOfDay(start).getTime();
  const endDay = startOfDay(end).getTime();
  return Math.max(0, Math.floor((endDay - startDay) / MS_DAY) + 1);
}

function pickGranularity(rangeMode, activeRange, rows) {
  if (rangeMode === "7d") return "day";
  if (rangeMode === "30d") return "week";
  if (rangeMode === "90d") return "week";
  if (rangeMode === "365d") return "month";

  const range = activeRange || deriveRange(rows);
  if (!range) return "month";

  const days = daysBetween(range.start, range.end);
  if (days <= 14) return "day";
  if (days <= 90) return "week";
  return "month";
}

function deriveRange(rows) {
  let min = null;
  let max = null;

  for (const row of rows) {
    const d = parseDateLoose(row?.date_issued || row?.date);
    if (!d) continue;
    const day = startOfDay(d);
    if (!min || day.getTime() < min.getTime()) min = day;
    if (!max || day.getTime() > max.getTime()) max = day;
  }

  if (!min || !max) return null;
  return { start: min, end: max };
}

function getRowDate(row) {
  return parseDateLoose(row?.date_issued || row?.date);
}

function formatMonthLabel(d) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(d);
}

function buildBuckets(start, end, granularity) {
  const buckets = [];
  if (!start || !end) return buckets;

  if (granularity === "day") {
    let cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      const key = formatYMD(cursor);
      buckets.push({ key, label: key, start: new Date(cursor) });
      cursor = new Date(cursor.getTime() + MS_DAY);
    }
    return buckets;
  }

  if (granularity === "week") {
    let cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      const key = formatYMD(cursor);
      buckets.push({
        key,
        label: `Week of ${key}`,
        start: new Date(cursor),
      });
      cursor = new Date(cursor.getTime() + MS_DAY * 7);
    }
    return buckets;
  }

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= endMonth.getTime()) {
    const key = `${cursor.getFullYear()}-${String(
      cursor.getMonth() + 1
    ).padStart(2, "0")}`;
    buckets.push({
      key,
      label: formatMonthLabel(cursor),
      start: new Date(cursor),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return buckets;
}

function bucketIndexFor(date, start, granularity) {
  const day = startOfDay(date);
  if (granularity === "day") {
    return Math.floor((day.getTime() - start.getTime()) / MS_DAY);
  }
  if (granularity === "week") {
    return Math.floor((day.getTime() - start.getTime()) / (MS_DAY * 7));
  }

  return (
    (day.getFullYear() - start.getFullYear()) * 12 +
    (day.getMonth() - start.getMonth())
  );
}

export function computeIssuedPremiumSeries({
  quoteSalesRows = [],
  rangeMode = "all",
  activeRange = null,
}) {
  return computeIssuedSeries({
    quoteSalesRows,
    rangeMode,
    activeRange,
    valueAccessor: (row) => Number(row?.issued_premium) || 0,
  });
}

export function computeIssuedCountSeries({
  quoteSalesRows = [],
  rangeMode = "all",
  activeRange = null,
}) {
  return computeIssuedSeries({
    quoteSalesRows,
    rangeMode,
    activeRange,
    valueAccessor: () => 1,
  });
}

function computeIssuedSeries({
  quoteSalesRows = [],
  rangeMode = "all",
  activeRange = null,
  valueAccessor,
}) {
  const issuedRows = quoteSalesRows.filter(
    (row) => lower(row?.status) === "issued"
  );

  const range = activeRange || deriveRange(issuedRows);
  if (!range) {
    return { buckets: [], agents: [], granularity: "month" };
  }

  const granularity = pickGranularity(rangeMode, activeRange, issuedRows);
  const buckets = buildBuckets(range.start, range.end, granularity);
  if (buckets.length === 0) {
    return { buckets: [], agents: [], granularity };
  }

  const totalsByAgent = new Map();
  const bucketTotals = buckets.map(() => ({}));

  for (const row of issuedRows) {
    const d = getRowDate(row);
    if (!d) continue;
    if (activeRange && !inRange(d, range.start, range.end)) continue;

    const idx = bucketIndexFor(d, buckets[0].start, granularity);
    if (idx < 0 || idx >= buckets.length) continue;

    const agent = String(row?.agent_name || "Unknown").trim() || "Unknown";
    const rawValue = valueAccessor ? valueAccessor(row) : 0;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    totalsByAgent.set(agent, (totalsByAgent.get(agent) || 0) + value);
    const bucket = bucketTotals[idx];
    bucket[agent] = (bucket[agent] || 0) + value;
  }

  const agents = Array.from(totalsByAgent.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([agent]) => agent);

  const filledBuckets = buckets.map((bucket, index) => {
    const totals = bucketTotals[index];
    let total = 0;
    for (const agent of agents) {
      total += totals[agent] || 0;
    }
    return { ...bucket, totals, total };
  });

  return { buckets: filledBuckets, agents, granularity };
}
