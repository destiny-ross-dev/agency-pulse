// src/lib/dataHealth.js
import { parseDateLoose } from "./dates";

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function toNum(v) {
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim().replace(/[$,]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Computes health stats for the normalized datasets.
 * Pass in normalized rows (already mapped to your canonical keys).
 */
export function computeDataHealth({
  activityRows = [],
  quoteSalesRows = [],
  paidLeadRows = [],
}) {
  // ---------- Activity ----------
  const activity = {
    totalRows: activityRows.length,
    missingDate: 0,
    missingAgent: 0,
    negativeCounts: 0,
    nonNumericCounts: 0,
  };

  for (const r of activityRows) {
    const d = parseDateLoose(r.date);
    if (!d) activity.missingDate += 1;
    if (isBlank(r.agent_name)) activity.missingAgent += 1;

    const numericKeys = [
      "dials_made",
      "contacts_made",
      "households_quoted",
      "total_quotes",
      "total_sales",
    ];

    for (const k of numericKeys) {
      if (isBlank(r[k])) continue; // allow blank
      const n = toNum(r[k]);
      if (Number.isNaN(n)) activity.nonNumericCounts += 1;
      else if (n < 0) activity.negativeCounts += 1;
    }
  }

  // ---------- Quotes & Sales ----------
  const quotesSales = {
    totalRows: quoteSalesRows.length,
    missingDate: 0,
    missingAgent: 0,
    missingStatus: 0,
    badStatus: 0,
    issuedMissingIssueDate: 0,
    issuedMissingIssuedPremium: 0,
    missingWrittenPremium: 0,
    negativePremiums: 0,
    missingLeadSource: 0,
    missingZip: 0,
  };

  const allowedStatus = new Set(["quoted", "issued"]);

  for (const r of quoteSalesRows) {
    const d = parseDateLoose(r.date);
    if (!d) quotesSales.missingDate += 1;

    if (isBlank(r.agent_name)) quotesSales.missingAgent += 1;

    const st = norm(r.status);
    if (isBlank(st)) quotesSales.missingStatus += 1;
    else if (!allowedStatus.has(st)) quotesSales.badStatus += 1;

    if (isBlank(r.lead_source)) quotesSales.missingLeadSource += 1;
    if (isBlank(r.zipcode)) quotesSales.missingZip += 1;

    // Premium sanity checks
    if (isBlank(r.written_premium)) {
      quotesSales.missingWrittenPremium += 1;
    } else {
      const wp = toNum(r.written_premium);
      if (!Number.isNaN(wp) && wp < 0) quotesSales.negativePremiums += 1;
    }

    if (st === "issued") {
      if (isBlank(r.date_issued) || !parseDateLoose(r.date_issued)) {
        quotesSales.issuedMissingIssueDate += 1;
      }

      if (isBlank(r.issued_premium)) {
        quotesSales.issuedMissingIssuedPremium += 1;
      } else {
        const ip = toNum(r.issued_premium);
        if (!Number.isNaN(ip) && ip < 0) quotesSales.negativePremiums += 1;
      }
    }
  }

  // ---------- Paid Leads ----------
  const paidLeads = {
    totalRows: paidLeadRows.length,
    missingDate: 0,
    missingLeadSource: 0,
    missingLeadCount: 0,
    missingLeadCost: 0,
    nonNumeric: 0,
    negative: 0,
    zeroLeadCount: 0,
    zeroLeadCost: 0,
  };

  for (const r of paidLeadRows) {
    const d = parseDateLoose(r.date);
    if (!d) paidLeads.missingDate += 1;

    if (isBlank(r.lead_source)) paidLeads.missingLeadSource += 1;

    if (isBlank(r.lead_count)) paidLeads.missingLeadCount += 1;
    else {
      const c = toNum(r.lead_count);
      if (Number.isNaN(c)) paidLeads.nonNumeric += 1;
      else {
        if (c < 0) paidLeads.negative += 1;
        if (c === 0) paidLeads.zeroLeadCount += 1;
      }
    }

    if (isBlank(r.lead_cost)) paidLeads.missingLeadCost += 1;
    else {
      const c = toNum(r.lead_cost);
      if (Number.isNaN(c)) paidLeads.nonNumeric += 1;
      else {
        if (c < 0) paidLeads.negative += 1;
        if (c === 0) paidLeads.zeroLeadCost += 1;
      }
    }
  }

  // ---------- Cross-file consistency (simple MVP) ----------
  // Paid lead sources present in Paid Leads file but not referenced in Quotes/Sales
  const paidSources = new Set(
    paidLeadRows.map((r) => String(r.lead_source ?? "").trim()).filter(Boolean)
  );
  const qsSources = new Set(
    quoteSalesRows
      .map((r) => String(r.lead_source ?? "").trim())
      .filter(Boolean)
  );

  let paidSourcesWithNoQuoteSales = 0;
  for (const s of paidSources) {
    if (!qsSources.has(s)) paidSourcesWithNoQuoteSales += 1;
  }

  const cross = {
    paidSourcesWithNoQuoteSales,
    paidSourcesCount: paidSources.size,
  };

  return { activity, quotesSales, paidLeads, cross };
}
