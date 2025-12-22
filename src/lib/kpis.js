// src/lib/kpis.js

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

export function computeCoreMetrics({
  activityRows,
  quoteSalesRows,
  paidLeadRows,
}) {
  // Treat status = "issued" as sold; status = "quoted" as quoted.
  const issued = quoteSalesRows.filter((r) => norm(r.status) === "issued");
  const quoted = quoteSalesRows.filter((r) => norm(r.status) === "quoted");

  const totalIssuedPremium = issued.reduce(
    (sum, r) => sum + (Number(r.issued_premium) || 0),
    0
  );
  const policiesIssued = issued.length;

  const totalQuotedOrIssued = quoted.length + issued.length;
  const conversionRate =
    totalQuotedOrIssued > 0 ? policiesIssued / totalQuotedOrIssued : 0;

  // Paid spend = sum(lead_count * lead_cost)
  const paidSpend = paidLeadRows.reduce(
    (sum, r) => sum + (Number(r.lead_count) || 0) * (Number(r.lead_cost) || 0),
    0
  );

  const cpa = policiesIssued > 0 ? paidSpend / policiesIssued : 0;

  // Some activity efficiency (optional but useful)
  const totalDials = activityRows.reduce(
    (sum, r) => sum + (Number(r.dials_made) || 0),
    0
  );
  const premiumPerDial = totalDials > 0 ? totalIssuedPremium / totalDials : 0;

  return {
    totalIssuedPremium,
    policiesIssued,
    conversionRate,
    costPerAcquisition: cpa,
    paidSpend,
    totalDials,
    premiumPerDial,
  };
}
