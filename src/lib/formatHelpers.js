export function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function money2(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ratio(n) {
  const x = Number(n || 0);
  return `${x.toFixed(2)}x`;
}

export function pct(n) {
  const x = Number(n || 0);
  return `${(x * 100).toFixed(1)}%`;
}

export function clampNum(v, min, max) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
