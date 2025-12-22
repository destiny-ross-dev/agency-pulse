// src/lib/mapping.js
import { SYNONYMS } from "./schemas";

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(s) {
  return norm(s).split(" ").filter(Boolean);
}

function scoreHeaderMatch(header, fieldKey, fieldLabel) {
  const h = norm(header);
  if (!h) return 0;

  // exact-ish wins
  if (h === norm(fieldKey)) return 100;

  // synonym matches
  const syns = SYNONYMS[fieldKey] ?? [];
  for (const syn of syns) {
    const s = norm(syn);
    if (h === s) return 95;
    if (h.includes(s)) return 85;
  }

  // token overlap with label
  const tokens = tokenize(h);
  const labelTokens = tokenize(fieldLabel ?? fieldKey);
  const overlap = tokens.filter((t) => labelTokens.includes(t)).length;
  if (overlap > 0) return 60 + overlap * 8;

  // small bonuses for common patterns
  if (h.includes("date") && fieldKey === "date") return 70;
  if ((h.includes("zip") || h.includes("postal")) && fieldKey === "zipcode")
    return 70;
  if (
    h.includes("premium") &&
    (fieldKey === "written_premium" || fieldKey === "issued_premium")
  )
    return 65;

  return 0;
}

export function suggestMapping(headers, requiredFields) {
  const suggestions = {};
  const used = new Set();

  for (const field of requiredFields) {
    let best = { header: "", score: 0 };

    for (const h of headers) {
      const score = scoreHeaderMatch(h, field.key, field.label);
      if (score > best.score) best = { header: h, score };
    }

    if (best.score >= 60 && best.header && !used.has(best.header)) {
      suggestions[field.key] = best.header;
      used.add(best.header);
    } else {
      suggestions[field.key] = "";
    }
  }

  return suggestions;
}
