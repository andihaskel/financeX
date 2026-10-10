import { describe, expect, it } from "vitest";

import { buildWealthAllocationSlices } from "@/lib/wealth/allocation-slices";

describe("buildWealthAllocationSlices", () => {
  it("returns cash-only when there are no positions", () => {
    expect(
      buildWealthAllocationSlices({
        accountCashUsd: 5000,
        positions: [],
      })
    ).toEqual([{ name: "Cash", value: 5000, color: "#10B981" }]);
  });

  it("splits cash, fixed income, and equity", () => {
    const slices = buildWealthAllocationSlices({
      accountCashUsd: 2000,
      positions: [
        { kind: "fixed_income", amountUsd: 3000 },
        { kind: "equity", amountUsd: 5000 },
      ],
    });

    expect(slices).toEqual([
      { name: "Cash", value: 2000, color: "#10B981" },
      { name: "Renta fija", value: 3000, color: "#0EA5E9" },
      { name: "Renta variable", value: 5000, color: "#F59E0B" },
    ]);
  });

  it("rolls leftover kinds into Other", () => {
    const slices = buildWealthAllocationSlices({
      accountCashUsd: 1000,
      positions: [
        { kind: "cash", amountUsd: 400 },
        { kind: "checking", amountUsd: 100 },
        { kind: "savings", amountUsd: 200 },
        { kind: "other", amountUsd: 300 },
        { kind: "fixed_income", amountUsd: 50 },
      ],
    });

    expect(slices).toEqual([
      { name: "Cash", value: 1000, color: "#10B981" },
      { name: "Renta fija", value: 50, color: "#0EA5E9" },
      { name: "Other", value: 1000, color: "#94A3B8" },
    ]);
  });

  it("treats legacy investment as equity", () => {
    const slices = buildWealthAllocationSlices({
      accountCashUsd: 0,
      positions: [{ kind: "investment", amountUsd: 1200 }],
    });

    expect(slices).toEqual([
      { name: "Renta variable", value: 1200, color: "#F59E0B" },
    ]);
  });

  it("filters zero slices", () => {
    expect(
      buildWealthAllocationSlices({
        accountCashUsd: 0,
        positions: [{ kind: "equity", amountUsd: 0 }],
      })
    ).toEqual([]);
  });
});
