// src/lib/dates.js

function safeStr(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

// Parses common formats:
// - YYYY-MM-DD
// - MM/DD/YYYY
// - MM/DD/YY
// - ISO timestamps
export function parseDateLoose(input) {
  const s = safeStr(input);
  if (!s) return null;

  // If ISO-ish or Date can parse it reliably, try that first
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  // Try MM/DD/YYYY or M/D/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    let yy = Number(m[3]);
    if (yy < 100) yy += 2000; // simple pivot; adjust if you need
    const d2 = new Date(yy, mm - 1, dd);
    if (!Number.isNaN(d2.getTime())) return d2;
  }

  return null;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// inclusive range check
export function inRange(dateObj, start, end) {
  if (!dateObj || !start || !end) return false;
  const t = dateObj.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

// Build ranges
export function makePresetRange(preset) {
  const today = startOfDay(new Date());

  if (preset === "all") return null;

  if (preset === "7d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(today) };
  }

  if (preset === "30d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { start, end: endOfDay(today) };
  }

  if (preset === "90d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return { start, end: endOfDay(today) };
  }

  if (preset === "365d") {
    const start = new Date(today);
    start.setDate(start.getDate() - 364);
    return { start, end: endOfDay(today) };
  }

  return null;
}

export function toInputDate(d) {
  // yyyy-mm-dd for <input type="date">
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseInputDate(value) {
  const s = safeStr(value);
  if (!s) return null;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// src/lib/dates.js (append)

export function formatYMD(d) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function findCoverage(rows, dateKey = "date") {
  let min = null;
  let max = null;

  for (const r of rows || []) {
    const d = parseDateLoose(r?.[dateKey]);
    if (!d) continue;

    const day = startOfDay(d);

    if (!min || day.getTime() < min.getTime()) min = day;
    if (!max || day.getTime() > max.getTime()) max = day;
  }

  if (!min || !max) return null;
  return { start: min, end: endOfDay(max) };
}
