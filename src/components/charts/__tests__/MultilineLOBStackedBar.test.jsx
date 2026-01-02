import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MultilineLOBStackedBar from "../MultilineLOBStackedBar";

describe("MultilineLOBStackedBar", () => {
  it("renders and toggles between volume and mix", async () => {
    const user = userEvent.setup();
    const series = {
      granularity: "week",
      lobs: ["Auto", "Fire", "Life", "Health"],
      buckets: [
        {
          bucket: "Week of Dec 30, 2024",
          Auto: 1,
          Fire: 1,
          Life: 0,
          Health: 0,
          total: 2,
          AutoPct: 0.5,
          FirePct: 0.5,
          LifePct: 0,
          HealthPct: 0,
        },
      ],
    };

    render(<MultilineLOBStackedBar series={series} />);
    expect(
      screen.getByRole("img", { name: /multiline lines of business mix/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Multiline Lines of Business Mix")
    ).toBeInTheDocument();

    const volumeButton = screen.getByRole("button", { name: /volume/i });
    const mixButton = screen.getByRole("button", { name: /mix/i });

    expect(volumeButton.className).toMatch(/active/);
    await user.click(mixButton);
    expect(mixButton.className).toMatch(/active/);
  });
});
