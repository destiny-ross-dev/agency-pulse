// src/lib/csv.js
import Papa from "papaparse";

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data ?? [];
        const headers = results.meta?.fields ?? Object.keys(rows[0] ?? {});
        resolve({
          fileName: file.name,
          rowCount: rows.length,
          headers,
          previewRows: rows.slice(0, 8),
          rows,
        });
      },
      error: (err) => reject(err),
    });
  });
}

export function parseCsvText(text, fileName = "demo.csv") {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data ?? [];
        const headers = results.meta?.fields ?? Object.keys(rows[0] ?? {});
        resolve({
          fileName,
          rowCount: rows.length,
          headers,
          previewRows: rows.slice(0, 8),
          rows,
        });
      },
      error: (err) => reject(err),
    });
  });
}
