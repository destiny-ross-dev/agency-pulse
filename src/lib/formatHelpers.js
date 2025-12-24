export function pct(n) {
  const x = Number(n || 0);
  return `${(x * 100).toFixed(1)}%`;
}

export function clampNum(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
