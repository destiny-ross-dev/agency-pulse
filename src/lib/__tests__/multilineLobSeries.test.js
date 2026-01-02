import { describe, expect, it } from "vitest";
import { buildMultilineLOBSeries } from "../multilineLobSeries";

describe("buildMultilineLOBSeries", () => {
  it("fills weekly buckets for the full range and counts multiline once per LOB", () => {
    const rows = [
      {
        date: "1/2/2025",
        policyholder: "A. Client",
        line_of_business: "Auto",
      },
      {
        date: "1/2/2025",
        policyholder: "A. Client",
        line_of_business: "Fire",
      },
      {
        date: "1/10/2025",
        policyholder: "B. Client",
        line_of_business: "Auto",
      },
    ];
    const series = buildMultilineLOBSeries(rows, {
      bucket: "week",
      range: { start: new Date(2025, 0, 1), end: new Date(2025, 0, 20) },
    });

    console.log(series);

    expect(series.buckets.length).toBe(4);
    expect(series.lobs).toEqual(["Auto", "Fire", "Life", "Health"]);
    expect(series.buckets[0].bucket).toBe("Week of Dec 30, 2024");
    expect(series.buckets.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(
      2
    );
    expect(series.buckets.some((bucket) => bucket.total === 0)).toBe(true);
  });
});
