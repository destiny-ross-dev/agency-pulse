export default function PageHeader({ title, subtitle }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </>
  );
}
