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

        policyholders: new Set(),
        policyholderDateLobs: new Map(),
        issuedByPolicyholder: new Map(),
        issuedPremiumByPolicyholder: new Map(),
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
    const policyholder = norm(r.policyholder);
    const quoteDate = norm(r.date);
    const lob = norm(r.line_of_business);

    // For MVP: each row is either Quoted or Issued
    if (st === "quoted") a.quotes += 1;
    if (st === "issued") a.issued += 1;

    a.writtenPremium += safeNum(r.written_premium);
    a.issuedPremium += safeNum(r.issued_premium);

    if (policyholder) {
      a.policyholders.add(policyholder);
      if (quoteDate) {
        if (!a.policyholderDateLobs.has(policyholder)) {
          a.policyholderDateLobs.set(policyholder, new Map());
        }
        const dateLobs = a.policyholderDateLobs.get(policyholder);
        if (!dateLobs.has(quoteDate)) {
          dateLobs.set(quoteDate, new Set());
        }
        if (lob) {
          dateLobs.get(quoteDate).add(lob);
        }
      }

      if (st === "issued") {
        a.issuedByPolicyholder.set(
          policyholder,
          (a.issuedByPolicyholder.get(policyholder) || 0) + 1
        );
        a.issuedPremiumByPolicyholder.set(
          policyholder,
          (a.issuedPremiumByPolicyholder.get(policyholder) || 0) +
            safeNum(r.issued_premium)
        );
      }
    }
  }

  // Derived metrics
  const agents = Array.from(byAgent.values()).map((a) => {
    const {
      policyholders,
      policyholderDateLobs,
      issuedByPolicyholder,
      issuedPremiumByPolicyholder,
      ...base
    } = a;
    const uniquePolicyholders = policyholders.size;
    let multilinePitchPolicyholders = 0;
    let multilinePitchDays = 0;
    let totalPolicyholderDays = 0;
    let multilineIssuedPolicyholders = 0;
    let multilineIssuedPremium = 0;
    let multilineIssuedPolicyholdersAll = 0;
    let singleLineIssuedPolicyholders = 0;
    let singleLineIssuedPremium = 0;
    const multilinePolicyholderSet = new Set();

    for (const [policyholder, dateLobs] of policyholderDateLobs.entries()) {
      let hasMultilinePitch = false;
      for (const lobSet of dateLobs.values()) {
        totalPolicyholderDays += 1;
        if (lobSet.size >= 2) {
          multilinePitchDays += 1;
          hasMultilinePitch = true;
        }
      }
      if (hasMultilinePitch) {
        multilinePolicyholderSet.add(policyholder);
      }

      const issuedCount = issuedByPolicyholder.get(policyholder) || 0;
      if (issuedCount > 1) {
        multilineIssuedPolicyholdersAll += 1;
        multilineIssuedPremium += issuedPremiumByPolicyholder.get(policyholder) || 0;
      } else if (issuedCount === 1) {
        singleLineIssuedPolicyholders += 1;
        singleLineIssuedPremium += issuedPremiumByPolicyholder.get(policyholder) || 0;
      }

      if (hasMultilinePitch && issuedCount > 1) {
        multilineIssuedPolicyholders += 1;
      }
    }

    multilinePitchPolicyholders = multilinePolicyholderSet.size;
    const multilinePitchRate = div(
      multilinePitchDays,
      totalPolicyholderDays
    );
    const multilineConversionRate = div(
      multilineIssuedPolicyholders,
      multilinePitchPolicyholders
    );
    const issuedPolicyholders = issuedByPolicyholder.size;
    const attachRate = div(a.issued, issuedPolicyholders);
    const avgMultilinePremium =
      multilineIssuedPolicyholdersAll > 0
        ? multilineIssuedPremium / multilineIssuedPolicyholdersAll
        : null;
    const avgSingleLinePremium = div(
      singleLineIssuedPremium,
      singleLineIssuedPolicyholders
    );
    const multilineLift =
      avgMultilinePremium === null || singleLineIssuedPolicyholders === 0
        ? null
        : avgMultilinePremium - avgSingleLinePremium;
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
      ...base,
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
      uniquePolicyholders,
      multilinePitchPolicyholders,
      multilinePitchRate,
      multilineConversionRate,
      attachRate,
      multilineLift,
    };
  });

  // Sort default by issued premium desc
  agents.sort((x, y) => (y.issuedPremium || 0) - (x.issuedPremium || 0));

  return agents;
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.round((pct / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function computeAgentInsights({
  activityRows = [],
  quoteSalesRows = [],
}) {
  const agents = computeAgentMetrics({ activityRows, quoteSalesRows });

  const totals = agents.reduce(
    (acc, agent) => {
      acc.dials += agent.dials || 0;
      acc.contacts += agent.contacts || 0;
      acc.quotes += agent.quotes || 0;
      return acc;
    },
    { dials: 0, contacts: 0, quotes: 0 }
  );
  const agencyContactRate = div(totals.contacts, totals.dials);
  const agencyPitchRate = div(totals.quotes, totals.contacts);

  const conversionRates = agents.map((agent) => agent.conversionRate || 0);
  const dialVolumes = agents.map((agent) => agent.dials || 0);
  const quoteVolumes = agents.map((agent) => agent.quotes || 0);
  const issuedVolumes = agents.map((agent) => agent.issued || 0);
  const issueRates = agents.map((agent) =>
    agent.quotes > 0 ? agent.issued / agent.quotes : 0
  );

  const thresholds = {
    highConversion: percentile(conversionRates, 75),
    lowVolume: percentile(dialVolumes, 25),
    highQuotes: percentile(quoteVolumes, 75),
    lowIssued: percentile(issuedVolumes, 25),
    lowIssueRate: percentile(issueRates, 25),
  };

  const byAgent = agents.reduce((acc, agent) => {
    const flags = [];
    const issueRate = agent.quotes > 0 ? agent.issued / agent.quotes : 0;

    if (
      agent.conversionRate >= thresholds.highConversion &&
      agent.dials <= thresholds.lowVolume
    ) {
      flags.push({
        key: "high-conversion-low-volume",
        label: "High conversion, low volume",
        detail: "Strong close rate on limited outreach.",
      });
    }

    if (
      agent.quotes >= thresholds.highQuotes &&
      (agent.issued <= thresholds.lowIssued || issueRate <= thresholds.lowIssueRate)
    ) {
      flags.push({
        key: "high-quotes-low-issuance",
        label: "High quotes, low issuance",
        detail: "Quoting volume is strong, issued count trails.",
      });
    }

    if (flags.length === 0) {
      flags.push({
        key: "within-benchmark",
        label: "No concerns noted",
        detail: "Agent performance is within benchmark.",
      });
    }

    acc[agent.agent] = {
      kpis: {
        dials: agent.dials,
        contacts: agent.contacts,
        quotes: agent.quotes,
        issued: agent.issued,
        conversionRate: agent.conversionRate,
        contactRate: agent.contactRate,
        pitchRate: agent.quotesPerContact,
        issuedPremium: agent.issuedPremium,
        multilinePitchRate: agent.multilinePitchRate,
        multilineConversionRate: agent.multilineConversionRate,
        attachRate: agent.attachRate,
        multilineLift: agent.multilineLift,
      },
      flags,
    };

    return acc;
  }, {});

  return {
    byAgent,
    thresholds,
    benchmarks: {
      contactRate: agencyContactRate,
      pitchRate: agencyPitchRate,
    },
  };
}
