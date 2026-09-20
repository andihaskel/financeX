import { describe, expect, it } from "vitest";

import {
  daysUntilDueInMonth,
  getZonedYmd,
  isDueOnCalendarDay,
  isDueWithinDays,
  monthsToScanForDueWindow,
} from "@/lib/control/due-today";

describe("isDueOnCalendarDay", () => {
  it("matches the due day", () => {
    expect(isDueOnCalendarDay(20, 2026, 9, 20)).toBe(true);
    expect(isDueOnCalendarDay(20, 2026, 9, 19)).toBe(false);
  });

  it("clamps due day to the last day of the month", () => {
    expect(isDueOnCalendarDay(31, 2026, 2, 28)).toBe(true);
    expect(isDueOnCalendarDay(31, 2026, 2, 27)).toBe(false);
  });

  it("rejects missing due days", () => {
    expect(isDueOnCalendarDay(null, 2026, 9, 20)).toBe(false);
  });
});

describe("isDueWithinDays", () => {
  it("includes today through 3 days ahead", () => {
    expect(isDueWithinDays(20, 2026, 9, 2026, 9, 17)).toBe(true); // 3d
    expect(isDueWithinDays(20, 2026, 9, 2026, 9, 18)).toBe(true); // 2d
    expect(isDueWithinDays(20, 2026, 9, 2026, 9, 20)).toBe(true); // today
    expect(isDueWithinDays(20, 2026, 9, 2026, 9, 16)).toBe(false); // 4d
    expect(isDueWithinDays(20, 2026, 9, 2026, 9, 21)).toBe(false); // overdue
  });

  it("handles cross-month windows", () => {
    expect(isDueWithinDays(1, 2026, 10, 2026, 9, 29)).toBe(true); // 2d
    expect(isDueWithinDays(1, 2026, 10, 2026, 9, 27)).toBe(false); // 4d
  });
});

describe("daysUntilDueInMonth", () => {
  it("returns the day delta", () => {
    expect(daysUntilDueInMonth(20, 2026, 9, 2026, 9, 17)).toBe(3);
    expect(daysUntilDueInMonth(20, 2026, 9, 2026, 9, 20)).toBe(0);
  });
});

describe("monthsToScanForDueWindow", () => {
  it("adds next month near month end", () => {
    expect(monthsToScanForDueWindow(2026, 9, 28)).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
    ]);
    expect(monthsToScanForDueWindow(2026, 9, 20)).toEqual([
      { year: 2026, month: 9 },
    ]);
  });
});

describe("getZonedYmd", () => {
  it("returns Y/M/D parts for a fixed instant in Montevideo", () => {
    // 2026-09-20 15:00 UTC = 12:00 in America/Montevideo (UTC-3)
    const result = getZonedYmd(
      "America/Montevideo",
      new Date("2026-09-20T15:00:00.000Z")
    );
    expect(result).toEqual({
      year: 2026,
      month: 9,
      day: 20,
      dateLabel: "2026-09-20",
    });
  });
});
