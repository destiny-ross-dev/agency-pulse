export default function GoalRow({ title, subtitle, value, onChange }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        <div style={{ color: "var(--muted)", fontWeight: 700 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          className="goal-input"
          type="number"
          min="0"
          max="100"
          step="1"
          value={Number(value ?? 0)}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode="numeric"
          aria-label={title}
        />
        <span style={{ color: "var(--muted2)", fontWeight: 900 }}>%</span>
      </div>
    </div>
  );
}
