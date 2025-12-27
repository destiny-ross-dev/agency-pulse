export default function GoalRow({
  title,
  subtitle,
  value,
  onChange,
  unit = "%",
  min = 0,
  max = 100,
  step = 1,
}) {
  const maxValue = max ?? undefined;
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
          min={min}
          max={maxValue}
          step={step}
          value={Number(value ?? 0)}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode="numeric"
          aria-label={title}
        />
        {unit ? (
          <span style={{ color: "var(--muted2)", fontWeight: 900 }}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}
