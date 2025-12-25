function StepPill({ label, active, done }) {
  const className = done ? "pill done" : active ? "pill active" : "pill";
  return <div className={className}>{label}</div>;
}

export default function Stepper({ step }) {
  return (
    <div className="stepper">
      <StepPill label="1. Data Import" active={step === 1} done={step > 1} />
      <StepPill label="2. Column Mapping" active={step === 2} done={step > 2} />
      <StepPill label="3. Analyze" active={step === 3} done={false} />
    </div>
  );
}
