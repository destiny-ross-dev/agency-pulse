// src/lib/normalize.js

function safeStr(v) {
  return v === undefined || v === null ? "" : String(v).trim();
}

function toNumber(v) {
  const s = safeStr(v).replace(/[$,]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize rows using mapping:
 * mapping = { agent_name: "Agent", date: "Written Date", ... }
 * returns rows with keys matching schema keys.
 */
export function normalizeRows(rawRows, mapping, options = {}) {
  const { numericKeys = [] } = options;

  return rawRows.map((row) => {
    const out = {};
    for (const [key, col] of Object.entries(mapping || {})) {
      if (!col) {
        out[key] = "";
        continue;
      }
      const val = row?.[col];
      out[key] = numericKeys.includes(key) ? toNumber(val) : safeStr(val);
    }
    return out;
  });
}
