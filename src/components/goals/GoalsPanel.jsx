import KPIGoals from "./KPIGoals";

export default function GoalsPanel({ open, onToggle, goals, updateGoal }) {
  return (
    <div className="goals">
      <div className="goals-head">
        <div>
          <p className="goals-title">Goals</p>
          <p className="goals-sub">
            Track target benchmarks and plan future performance goals.
          </p>
        </div>

        <button
          type="button"
          className="collapse-btn"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="goals-content"
        >
          <span>{open ? "Collapse" : "Expand"}</span>
          <svg
            className={`chev ${open ? "open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open ? (
        <div id="goals-content">
          <KPIGoals goals={goals} updateGoal={updateGoal} />
        </div>
      ) : null}
    </div>
  );
}
