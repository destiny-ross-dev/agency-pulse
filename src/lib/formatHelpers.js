import { parseDateLoose } from "./dates";

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

export function formatMoneyShort(value) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function formatNumberShort(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
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

const readableDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatReadableDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : parseDateLoose(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return readableDateFormatter.format(date);
}
