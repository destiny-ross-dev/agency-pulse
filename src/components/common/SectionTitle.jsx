export default function SectionTitle({ icon, title, subtitle }) {
  return (
    <div className="section-head">
      <div className="section-icon">{icon}</div>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}
