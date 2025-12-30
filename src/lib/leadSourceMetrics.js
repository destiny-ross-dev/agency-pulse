// src/lib/leadSourceMetrics.js

function normName(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.-]/g, ""); // strip weird punctuation
}

export function normalizeLeadSourceName(value) {
  return normName(value);
}

function displayName(originals) {
  // prefer the most common original casing
  let best = "";
  let bestCount = 0;
  for (const [name, count] of originals.entries()) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best || "Unknown";
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function div(a, b) {
  return b > 0 ? a / b : 0;
}

/**
 * Computes lead source ROI table rows.
 * Inputs should be normalized rows (canonical keys), already date-filtered.
 *
 * quoteSalesRows: expects { status, lead_source, issued_premium, written_premium }
 * paidLeadRows: expects { lead_source, lead_count, lead_cost }
 */
export function computeLeadSourceROI({
  quoteSalesRows = [],
  paidLeadRows = [],
}) {
  // Map: normalized key -> record
  const map = new Map();

  function get(key) {
    if (!map.has(key)) {
      map.set(key, {
        key,
        originals: new Map(), // preserve display casing
        leads: 0,
        spend: 0,

        quoted: 0,
        issued: 0,
        writtenPremium: 0,
        issuedPremium: 0,
      });
    }
    return map.get(key);
  }

  // Paid leads aggregation
  for (const r of paidLeadRows) {
    const raw = String(r.lead_source ?? "").trim();
    const key = normName(raw) || "unknown";
    const rec = get(key);

    if (raw) rec.originals.set(raw, (rec.originals.get(raw) || 0) + 1);

    const leadCount = n(r.lead_count);
    const leadCost = n(r.lead_cost);
    rec.leads += leadCount;
    rec.spend += leadCount * leadCost;
  }

  // Quotes & sales aggregation
  for (const r of quoteSalesRows) {
    const raw = String(r.lead_source ?? "").trim();
    const key = normName(raw) || "unknown";
    const rec = get(key);

    if (raw) rec.originals.set(raw, (rec.originals.get(raw) || 0) + 1);

    const status = String(r.status ?? "")
      .trim()
      .toLowerCase();
    if (status === "quoted") rec.quoted += 1;
    if (status === "issued") rec.issued += 1;

    rec.writtenPremium += n(r.written_premium);
    rec.issuedPremium += n(r.issued_premium);
  }

  // Build rows + derived KPIs
  const rows = Array.from(map.values()).map((rec) => {
    const totalQuotedOrIssued = rec.quoted + rec.issued;
    const conversion = div(rec.issued, totalQuotedOrIssued); // your MVP conversion definition

    const cpa = div(rec.spend, rec.issued); // spend / issued
    const spendPerLead = div(rec.spend, rec.leads);
    const premiumPerSpend = div(rec.issuedPremium, rec.spend); // directional ROI proxy

    return {
      leadSource:
        displayName(rec.originals) ||
        (rec.key === "unknown" ? "Unknown" : rec.key),
      leads: rec.leads,
      spend: rec.spend,
      spendPerLead,

      quoted: rec.quoted,
      issued: rec.issued,
      totalQuotedOrIssued,

      conversion,
      cpa,

      writtenPremium: rec.writtenPremium,
      issuedPremium: rec.issuedPremium,
      premiumPerSpend,
    };
  });

  // Default sort: best premium per spend (descending), then issued premium
  rows.sort(
    (a, b) =>
      b.premiumPerSpend - a.premiumPerSpend || b.issuedPremium - a.issuedPremium
  );

  return rows;
}

/**
 * Computes quote activity counts by lead source based on quote date filtering.
 * quoteSalesRows: expects { lead_source }
 */
export function computeLeadSourceQuoteActivity({ quoteSalesRows = [] }) {
  const map = new Map();

  function get(key) {
    if (!map.has(key)) {
      map.set(key, {
        key,
        originals: new Map(),
        count: 0,
      });
    }
    return map.get(key);
  }

  for (const r of quoteSalesRows) {
    const raw = String(r.lead_source ?? "").trim();
    const key = normName(raw) || "unknown";
    const rec = get(key);

    if (raw) rec.originals.set(raw, (rec.originals.get(raw) || 0) + 1);

    rec.count += 1;
  }

  const rows = Array.from(map.values()).map((rec) => ({
    key: rec.key,
    leadSource:
      displayName(rec.originals) ||
      (rec.key === "unknown" ? "Unknown" : rec.key),
    count: rec.count,
  }));

  rows.sort(
    (a, b) => b.count - a.count || a.leadSource.localeCompare(b.leadSource)
  );

  return rows;
}
