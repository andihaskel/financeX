import { describe, expect, it } from "vitest";

import {
  IMPORT_DATE_SHIFT_DEDUPE_DAYS,
  isImportDuplicateDespiteDateShift,
} from "@/lib/categorization/normalize";

describe("isImportDuplicateDespiteDateShift", () => {
  const base = {
    accountId: "acc-1",
    amount: -36000,
    normalizedDescription: "TRANSFER ROCIO",
  };

  it("matches when only the date changed within the window", () => {
    expect(
      isImportDuplicateDespiteDateShift(
        { ...base, transactionDate: "2026-08-28" },
        { ...base, transactionDate: "2026-09-03" }
      )
    ).toBe(true);
  });

  it("does not match when dates are too far apart", () => {
    expect(
      isImportDuplicateDespiteDateShift(
        { ...base, transactionDate: "2026-08-01" },
        { ...base, transactionDate: "2026-10-01" }
      )
    ).toBe(false);
  });

  it("does not match different amounts or accounts", () => {
    expect(
      isImportDuplicateDespiteDateShift(
        { ...base, transactionDate: "2026-09-01" },
        { ...base, amount: -36001, transactionDate: "2026-09-02" }
      )
    ).toBe(false);
    expect(
      isImportDuplicateDespiteDateShift(
        { ...base, transactionDate: "2026-09-01" },
        {
          ...base,
          accountId: "acc-2",
          transactionDate: "2026-09-02",
        }
      )
    ).toBe(false);
  });

  it(`uses a ${IMPORT_DATE_SHIFT_DEDUPE_DAYS}-day window`, () => {
    expect(IMPORT_DATE_SHIFT_DEDUPE_DAYS).toBeGreaterThanOrEqual(31);
  });
});
