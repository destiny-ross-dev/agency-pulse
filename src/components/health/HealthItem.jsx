export default function HealthItem({ label, note, count }) {
  const n = Number(count || 0);
  const cls = n > 0 ? "health-count warn" : "health-count ok";

  return (
    <div className="health-item">
      <div className="health-left">
        <div className="health-label">{label}</div>
        <div className="health-note">{note}</div>
      </div>
      <div className={cls}>{n.toLocaleString()}</div>
    </div>
  );
}
