import { formatYMD, parseDateLoose, startOfDay } from "./dates";
import { buildBuckets, bucketIndexFor } from "./timeBuckets";

const MS_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LOB_ORDER = ["Auto", "Fire", "Life", "Health"];

function normalizeLob(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "auto") return "Auto";
  if (lower === "fire") return "Fire";
  if (lower === "life") return "Life";
  if (lower === "health") return "Health";
  return raw;
}

function getRowDate(row) {
  return parseDateLoose(
    row?.dateQuoted || row?.date_quoted || row?.date || row?.date_issued
  );
}

function getOpportunityId(row) {
  const raw =
    row?.opportunity_id ||
    row?.opportunityId ||
    row?.opportunityID ||
    row?.opportunity;
  const id = String(raw ?? "").trim();
  return id || "";
}

function getCustomerId(row) {
  const raw =
    row?.customer_id ||
    row?.customerId ||
    row?.policyholder ||
    row?.customer ||
    row?.client ||
    row?.insured;
  const id = String(raw ?? "").trim();
  return id || "";
}

function windowKeyFor(date, groupWindowDays) {
  const day = startOfDay(date);
  if (!groupWindowDays || groupWindowDays <= 1) return formatYMD(day);
  const dayIndex = Math.floor(day.getTime() / MS_DAY);
  const windowStartIndex = dayIndex - (dayIndex % groupWindowDays);
  return formatYMD(new Date(windowStartIndex * MS_DAY));
}

function bucketDescriptor(date, bucket) {
  const buckets = buildBuckets({
    start: date,
    end: date,
    granularity: bucket,
  });
  const fallback = startOfDay(date);
  const entry = buckets[0];
  const bucketStart = entry?.start || fallback;
  return {
    key: entry?.key || formatYMD(bucketStart),
    label: entry?.label || formatYMD(bucketStart),
    sortKey: bucketStart.getTime(),
  };
}

export function buildMultilineLOBSeries(
  rows,
  { bucket = "month", groupWindowDays = 0, range = null } = {}
) {
  const groupMap = new Map();

  for (const row of rows || []) {
    const date = getRowDate(row);
    if (!date) continue;

    const lob = normalizeLob(row?.line_of_business || row?.lineOfBusiness);
    if (!lob) continue;

    const opportunityId = getOpportunityId(row);
    const groupKey = opportunityId
      ? `opp__${opportunityId}`
      : (() => {
          const customerId = getCustomerId(row);
          if (!customerId) return "";
          const windowKey = windowKeyFor(date, groupWindowDays);
          return `cust__${customerId}__${windowKey}`;
        })();

    if (!groupKey) continue;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { lobs: new Set(), minDate: date });
    }
    const group = groupMap.get(groupKey);
    group.lobs.add(lob);
    if (date.getTime() < group.minDate.getTime()) {
      group.minDate = date;
    }
  }

  const bucketMap = new Map();
  const lobsSeen = new Set();
  const hasRange = range?.start && range?.end;

  if (hasRange) {
    const buckets = buildBuckets({
      start: range.start,
      end: range.end,
      granularity: bucket,
    });
    if (buckets.length === 0) {
      return { buckets: [], lobs: DEFAULT_LOB_ORDER, granularity: bucket };
    }
    for (const bucketEntry of buckets) {
      bucketMap.set(bucketEntry.key, {
        label: bucketEntry.label,
        sortKey: bucketEntry.start.getTime(),
        counts: {},
      });
    }

    for (const group of groupMap.values()) {
      if (group.lobs.size < 2) continue;
      const idx = bucketIndexFor({
        date: group.minDate,
        start: buckets[0].start,
        granularity: bucket,
      });
      if (idx < 0 || idx >= buckets.length) continue;
      const bucketEntry = bucketMap.get(buckets[idx].key);
      for (const lob of group.lobs) {
        bucketEntry.counts[lob] = (bucketEntry.counts[lob] || 0) + 1;
        lobsSeen.add(lob);
      }
    }
  } else {
    for (const group of groupMap.values()) {
      if (group.lobs.size < 2) continue;
      const bucketInfo = bucketDescriptor(group.minDate, bucket);

      if (!bucketMap.has(bucketInfo.key)) {
        bucketMap.set(bucketInfo.key, {
          label: bucketInfo.label,
          sortKey: bucketInfo.sortKey,
          counts: {},
        });
      }

      const bucketEntry = bucketMap.get(bucketInfo.key);
      for (const lob of group.lobs) {
        bucketEntry.counts[lob] = (bucketEntry.counts[lob] || 0) + 1;
        lobsSeen.add(lob);
      }
    }
  }

  const extraLobs = Array.from(lobsSeen)
    .filter((lob) => !DEFAULT_LOB_ORDER.includes(lob))
    .sort((a, b) => a.localeCompare(b));
  const lobs = [...DEFAULT_LOB_ORDER, ...extraLobs];

  const buckets = Array.from(bucketMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((bucketEntry) => {
      let total = 0;
      const row = {
        bucket: bucketEntry.label,
        total: 0,
      };

      for (const lob of lobs) {
        const count = bucketEntry.counts[lob] || 0;
        row[lob] = count;
        total += count;
      }

      row.total = total;
      for (const lob of lobs) {
        row[`${lob}Pct`] = total > 0 ? row[lob] / total : 0;
      }

      return row;
    });

  return { buckets, lobs, granularity: bucket };
}
