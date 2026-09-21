import { describe, expect, it } from "vitest";

import {
  formatMonthsCoveredLabel,
  formatStatementDateRange,
  monthsCoveredByDates,
} from "@/lib/import/statement-months";

describe("monthsCoveredByDates", () => {
  it("collects unique months sorted", () => {
    expect(
      monthsCoveredByDates(["2026-03-02", "2026-02-28", "2026-03-15", "bad"])
    ).toEqual(["2026-02", "2026-03"]);
  });
});

describe("formatStatementDateRange", () => {
  it("formats cross-month ranges", () => {
    expect(formatStatementDateRange("2026-02-20", "2026-03-15")).toBe(
      "Feb 20 – Mar 15, 2026"
    );
  });
});

describe("formatMonthsCoveredLabel", () => {
  it("formats multi-month span", () => {
    expect(formatMonthsCoveredLabel(["2026-02", "2026-03"])).toBe(
      "Feb 2026 – Mar 2026"
    );
  });
});
