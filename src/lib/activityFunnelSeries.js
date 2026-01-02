import { formatReadableDate } from "./formatHelpers";
import { formatYMD, inRange, parseDateLoose, startOfDay } from "./dates";

const MS_DAY = 24 * 60 * 60 * 1000;

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function daysBetween(start, end) {
  const startDay = startOfDay(start).getTime();
  const endDay = startOfDay(end).getTime();
  return Math.max(0, Math.floor((endDay - startDay) / MS_DAY) + 1);
}

function startOfWeek(date) {
  const day = startOfDay(date);
  const dayIndex = (day.getDay() + 6) % 7; // 0 = Monday
  return new Date(day.getTime() - dayIndex * MS_DAY);
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
    const d = parseDateLoose(row?.date);
    if (!d) continue;
    const day = startOfDay(d);
    if (!min || day.getTime() < min.getTime()) min = day;
    if (!max || day.getTime() > max.getTime()) max = day;
  }

  if (!min || !max) return null;
  return { start: min, end: max };
}

function buildBuckets(start, end, granularity) {
  const buckets = [];
  if (!start || !end) return buckets;

  if (granularity === "day") {
    let cursor = startOfDay(start);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      const key = formatYMD(cursor);
      buckets.push({
        key,
        label: formatReadableDate(cursor),
        start: new Date(cursor),
      });
      cursor = new Date(cursor.getTime() + MS_DAY);
    }
    return buckets;
  }

  if (granularity === "week") {
    let cursor = startOfWeek(start);
    const endDay = startOfDay(end);
    while (cursor.getTime() <= endDay.getTime()) {
      const key = formatYMD(cursor);
      buckets.push({
        key,
        label: `Week of ${formatReadableDate(cursor)}`,
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
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(cursor),
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

export function computeActivityFunnelSeries({
  activityRows = [],
  rangeMode = "all",
  activeRange = null,
}) {
  const range = activeRange || deriveRange(activityRows);
  if (!range) {
    return { buckets: [], granularity: "month" };
  }

  const granularity = pickGranularity(rangeMode, activeRange, activityRows);
  const buckets = buildBuckets(range.start, range.end, granularity);
  if (buckets.length === 0) {
    return { buckets: [], granularity };
  }

  const bucketTotals = buckets.map(() => ({
    dials: 0,
    contacts: 0,
    householdsQuoted: 0,
    sales: 0,
  }));

  for (const row of activityRows) {
    const d = parseDateLoose(row?.date);
    if (!d) continue;
    if (activeRange && !inRange(d, range.start, range.end)) continue;

    const idx = bucketIndexFor(d, buckets[0].start, granularity);
    if (idx < 0 || idx >= buckets.length) continue;

    const bucket = bucketTotals[idx];
    bucket.dials += safeNum(row?.dials_made);
    bucket.contacts += safeNum(row?.contacts_made);
    bucket.householdsQuoted += safeNum(row?.households_quoted);
    bucket.sales += safeNum(row?.total_sales);
  }

  const filledBuckets = buckets.map((bucket, index) => ({
    ...bucket,
    totals: bucketTotals[index],
  }));

  return { buckets: filledBuckets, granularity };
}
