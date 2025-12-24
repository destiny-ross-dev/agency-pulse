import GoalRow from "./GoalRow";

export default function KPIGoals({ goals, updateGoal }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      <div className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div>
              <div className="toolbar-title">KPI Goals</div>
              <div className="small">
                Set target benchmarks. Funnel rows will be colored by how close
                you are to each target.
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <GoalRow
            title="Contact Rate Target"
            subtitle="Dials → Contacts (% of dials that become contacts)"
            value={goals.contactRateTargetPct}
            onChange={(v) => updateGoal("contactRateTargetPct", v)}
          />
          <div className="hr" />
          <GoalRow
            title="Quote Rate Target"
            subtitle="Contacts → Quotes (% of contacts that become quotes)"
            value={goals.quoteRateTargetPct}
            onChange={(v) => updateGoal("quoteRateTargetPct", v)}
          />
          <div className="hr" />
          <GoalRow
            title="Issue Rate Target"
            subtitle="Quotes → Issued (% of quotes that issue)"
            value={goals.issueRateTargetPct}
            onChange={(v) => updateGoal("issueRateTargetPct", v)}
          />
        </div>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div>
              <div className="toolbar-title">More Goals (Coming Soon)</div>
              <div className="small">
                Reserved space for additional targets (CPA, Premium per Dial,
                Lead Source ROI, etc.).
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 14, color: "var(--muted)", fontWeight: 700 }}>
          <div style={{ marginBottom: 10, color: "#475569" }}>
            Add future goal sections here:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Agent Efficiency Goals</li>
            <li>Lead Source ROI Goals</li>
            <li>CPA Targets</li>
            <li>Premium per Contact Targets</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
