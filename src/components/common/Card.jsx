export default function Card({ children, pad = false }) {
  return <div className={`card ${pad ? "pad" : ""}`}>{children}</div>;
}
