export default function SectionTitle({ icon, title, subtitle, style }) {
  return (
    <div className="section-head" style={style}>
      <div className="section-icon">{icon}</div>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
