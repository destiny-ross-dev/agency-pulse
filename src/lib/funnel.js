// src/lib/funnel.js

function lower(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function div(a, b) {
  return b > 0 ? a / b : 0;
}

/**
 * Funnel definitions (MVP):
 * - Dials, Contacts come from Activity file totals
 * - Quotes = count of rows in Quotes/Sales where Status is Quoted OR Issued
 * - Issued = count of rows in Quotes/Sales where Status is Issued
 *
 * This matches your conversion definition: Issued / (Quoted + Issued)
 */
export function computeFunnel({ activityRows = [], quoteSalesRows = [] }) {
  const dials = activityRows.reduce((s, r) => s + n(r.dials_made), 0);
  const contacts = activityRows.reduce((s, r) => s + n(r.contacts_made), 0);

  let quoted = 0;
  let issued = 0;

  for (const r of quoteSalesRows) {
    const st = lower(r.status);
    if (st === "quoted") quoted += 1;
    if (st === "issued") issued += 1;
  }

  const quotes = quoted + issued;

  const stages = [
    { key: "dials", label: "Dials", count: dials },
    { key: "contacts", label: "Contacts", count: contacts },
    { key: "quotes", label: "Quotes", count: quotes },
    { key: "issued", label: "Issued", count: issued },
  ];

  const transitions = [
    {
      from: "Dials",
      to: "Contacts",
      fromCount: dials,
      toCount: contacts,
      rate: div(contacts, dials),
      drop: div(dials - contacts, dials),
    },
    {
      from: "Contacts",
      to: "Quotes",
      fromCount: contacts,
      toCount: quotes,
      rate: div(quotes, contacts),
      drop: div(contacts - quotes, contacts),
    },
    {
      from: "Quotes",
      to: "Issued",
      fromCount: quotes,
      toCount: issued,
      rate: div(issued, quotes),
      drop: div(quotes - issued, quotes),
    },
  ];

  // Worst transition = lowest rate (ignore cases where fromCount = 0)
  const valid = transitions.filter((t) => t.fromCount > 0);
  let worst = null;
  for (const t of valid) {
    if (!worst || t.rate < worst.rate) worst = t;
  }

  return { stages, transitions, worstTransition: worst };
}

/**
 * Compute funnels grouped by agent name.
 * Uses Activity agent_name and Quotes/Sales agent_name.
 */
export function computeFunnelByAgent({
  activityRows = [],
  quoteSalesRows = [],
}) {
  const map = new Map();

  function get(agent) {
    const name = String(agent ?? "").trim() || "Unknown";
    if (!map.has(name)) {
      map.set(name, {
        activityRows: [],
        quoteSalesRows: [],
      });
    }
    return map.get(name);
  }

  for (const r of activityRows) get(r.agent_name).activityRows.push(r);
  for (const r of quoteSalesRows) get(r.agent_name).quoteSalesRows.push(r);

  const out = new Map();
  for (const [agent, bucket] of map.entries()) {
    out.set(agent, computeFunnel(bucket));
  }
  return out; // Map(agent -> funnel)
}
