export default function SegButton({ active, children, onClick }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {children}
    </button>
  );
}
