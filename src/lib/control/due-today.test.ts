import { describe, expect, it } from "vitest";

import { getZonedYmd, isDueOnCalendarDay } from "@/lib/control/due-today";

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
