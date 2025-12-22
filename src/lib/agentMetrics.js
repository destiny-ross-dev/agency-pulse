// src/lib/agentMetrics.js

function norm(s) {
  return String(s ?? "").trim();
}

function lower(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function div(a, b) {
  return b > 0 ? a / b : 0;
}

function per100(n, denom) {
  return denom > 0 ? (n / denom) * 100 : 0;
}

/**
 * Build per-agent rollups from normalized rows.
 * - activityRows: keys: agent_name, dials_made, contacts_made, total_quotes, total_sales...
 * - quoteSalesRows: keys: agent_name, status, issued_premium, written_premium...
 */
export function computeAgentMetrics({
  activityRows = [],
  quoteSalesRows = [],
}) {
  const byAgent = new Map();

  function get(agentName) {
    const name = norm(agentName) || "Unknown";
    if (!byAgent.has(name)) {
      byAgent.set(name, {
        agent: name,

        // activity totals
        dials: 0,
        contacts: 0,
        activityQuotes: 0,
        activitySales: 0,

        // quote/sales totals
        quotes: 0,
        issued: 0,
        writtenPremium: 0,
        issuedPremium: 0,
      });
    }
    return byAgent.get(name);
  }

  // Activity rollup
  for (const r of activityRows) {
    const a = get(r.agent_name);
    a.dials += safeNum(r.dials_made);
    a.contacts += safeNum(r.contacts_made);
    a.activityQuotes += safeNum(r.total_quotes);
    a.activitySales += safeNum(r.total_sales);
  }

  // Quotes/Sales rollup
  for (const r of quoteSalesRows) {
    const a = get(r.agent_name);
    const st = lower(r.status);

    // For MVP: each row is either Quoted or Issued
    if (st === "quoted") a.quotes += 1;
    if (st === "issued") a.issued += 1;

    a.writtenPremium += safeNum(r.written_premium);
    a.issuedPremium += safeNum(r.issued_premium);
  }

  // Derived metrics
  const agents = Array.from(byAgent.values()).map((a) => {
    const totalQuotedOrIssued = a.quotes + a.issued;
    const conversionRate = div(a.issued, totalQuotedOrIssued); // issued / (quoted + issued)
    const contactRate = div(a.contacts, a.dials); // contacts / dials

    const quotesPerContact = div(a.quotes, a.contacts); // quotes / contacts
    const issuedPerContact = div(a.issued, a.contacts); // issued / contacts

    const issuedPer100Dials = per100(a.issued, a.dials);
    const quotesPer100Dials = per100(a.quotes, a.dials);
    const contactsPer100Dials = per100(a.contacts, a.dials);

    const issuedPremPerDial = div(a.issuedPremium, a.dials);
    const issuedPremPerContact = div(a.issuedPremium, a.contacts);
    const issuedPremPerIssued = div(a.issuedPremium, a.issued);

    return {
      ...a,
      conversionRate,
      contactRate,
      quotesPerContact,
      issuedPerContact,
      issuedPer100Dials,
      quotesPer100Dials,
      contactsPer100Dials,
      issuedPremPerDial,
      issuedPremPerContact,
      issuedPremPerIssued,
    };
  });

  // Sort default by issued premium desc
  agents.sort((x, y) => (y.issuedPremium || 0) - (x.issuedPremium || 0));

  return agents;
}
