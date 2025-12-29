export default function KPICard({
  title,
  value,
  hint,
  as: Component = "div",
  className = "",
  ...rest
}) {
  const kpiClassName = ["kpi", className].filter(Boolean).join(" ");

  return (
    <Component className={kpiClassName} {...rest}>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </Component>
  );
}
