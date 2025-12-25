// src/components/funnel/FunnelDiagnostics.jsx
import React, { useMemo } from "react";
import { pct } from "../../lib/formatHelpers";

/**
 * FunnelDiagnostics
 * - Renders KPI Goals (3 funnel targets + placeholder for future goal sections)
 * - Renders Funnel Diagnostics table (Agency / By Agent)
 * - Colors each transition row based on target attainment:
 *    - green: actual >= target
 *    - yellow: actual >= 75% of target
 *    - red: actual < 75% of target
 *
 * Expected funnelData shape:
 * {
 *   agency: { transitions: [{ from, to, fromCount, toCount, rate, drop }], worstTransition? },
 *   byAgent: Map,
 *   agents: string[],
 *   agentName: string,
 *   agentFunnel: { transitions: [...] } | null
 * }
 */

export default function FunnelDiagnostics({
  funnelData,
  funnelMode,
  setFunnelMode,
  selectedAgent,
  setSelectedAgent,

  // Goals state should live in App.jsx (or a store) and be passed in
  goals,
}) {
  function targetPctForTransition(t) {
    const from = String(t?.from || "")
      .trim()
      .toLowerCase();
    const to = String(t?.to || "")
      .trim()
      .toLowerCase();

    if (from === "dials" && to === "contacts")
      return Number(goals.contactRateTargetPct || 0);

    if (from === "contacts" && to === "quotes")
      return Number(goals.quoteRateTargetPct || 0);

    // Support both "Issued" and "Sales" naming (future-proof)
    if (from === "quotes" && (to === "issued" || to === "sales"))
      return Number(goals.issueRateTargetPct || 0);

    return 0;
  }

  function rowClassForTransition(t) {
    const actualPct = Number(t?.rate || 0) * 100; // rate is 0-1
    const target = Number(targetPctForTransition(t) || 0);

    // If target is 0, don't color (avoids confusing all-green when unset)
    if (!target) return "";

    if (actualPct >= target) return "funnel-row-good";
    if (actualPct >= 0.75 * target) return "funnel-row-warn";
    return "funnel-row-bad";
  }

  function worstOffTargetTransition(transitions) {
    const list = Array.isArray(transitions) ? transitions : [];
    // Find transition furthest below its target (largest (target-actual) where actual<target)
    let worst = null;
    let worstGap = 0;

    for (const t of list) {
      if (!t || (t.fromCount || 0) <= 0) continue;

      const target = Number(targetPctForTransition(t) || 0);
      if (!target) continue;

      const actual = Number(t.rate || 0) * 100;
      const gap = target - actual;

      if (gap > worstGap) {
        worstGap = gap;
        worst = t;
      }
    }

    return worst;
  }

  const activeFunnel = useMemo(() => {
    if (!funnelData) return null;
    return funnelMode === "agent" ? funnelData.agentFunnel : funnelData.agency;
  }, [funnelData, funnelMode]);

  const worst = useMemo(() => {
    if (!activeFunnel) return null;
    return worstOffTargetTransition(activeFunnel.transitions);
  }, [activeFunnel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!funnelData) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* KPI GOALS */}

      {/* FUNNEL DIAGNOSTICS TABLE */}
      <div className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div>
              <div className="toolbar-title">Funnel Diagnostics</div>
              <div className="small">
                Where performance drops: Dials → Contacts → Quotes → Issued.
              </div>
            </div>

            <div className="seg seg-scroll" style={{ marginLeft: 6 }}>
              <button
                type="button"
                className={funnelMode === "agency" ? "active" : ""}
                onClick={() => setFunnelMode?.("agency")}
              >
                Agency
              </button>
              <button
                type="button"
                className={funnelMode === "agent" ? "active" : ""}
                onClick={() => setFunnelMode?.("agent")}
              >
                By Agent
              </button>
            </div>

            {funnelMode === "agent" ? (
              <select
                className="select funnel-select"
                value={funnelData.agentName || selectedAgent || ""}
                onChange={(e) => setSelectedAgent?.(e.target.value)}
              >
                {(funnelData.agents || []).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="roi-badges">
            {worst ? (
              <span
                className="funnel-badge warn"
                title="Furthest below its target goal"
              >
                Most off-target: {worst.from} → {worst.to} ({pct(worst.rate)} vs
                target {targetPctForTransition(worst)}%)
              </span>
            ) : null}
          </div>
        </div>

        <div className="table-wrap">
          {!activeFunnel ? (
            <div
              style={{ padding: 14, color: "var(--muted)", fontWeight: 700 }}
            >
              No funnel data for the selected date range.
            </div>
          ) : (
            <table className="funnel-table">
              <thead>
                <tr>
                  <th>Transition</th>
                  <th className="right">From</th>
                  <th className="right">To</th>
                  <th className="right">Rate</th>
                  <th className="right">Target</th>
                  <th className="right">Drop-off</th>
                </tr>
              </thead>

              <tbody>
                {(activeFunnel.transitions || []).map((t) => (
                  <tr
                    key={`${t.from}->${t.to}`}
                    className={rowClassForTransition(t)}
                  >
                    <td style={{ fontWeight: 900 }}>
                      {t.from} → {t.to}
                    </td>
                    <td className="right">
                      {Math.round(t.fromCount || 0).toLocaleString()}
                    </td>
                    <td className="right">
                      {Math.round(t.toCount || 0).toLocaleString()}
                    </td>
                    <td className="right">{pct(t.rate)}</td>
                    <td className="right">{targetPctForTransition(t)}%</td>
                    <td className="right">{pct(t.drop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="funnel-tip-wrap">
          <div className="funnel-help">
            Tip: a low <b>Contact Ratio</b> suggests list quality or dialing
            strategy issues. A low <b>Quote Ratio</b> suggests needs
            discovery/pitch issues. A low <b>Conversion Ratio</b> suggests
            follow-up, objections, or underwriting friction.
          </div>
        </div>
      </div>
    </div>
  );
}
