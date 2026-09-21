import { describe, expect, it } from "vitest";

import { computeAccountCashBalance } from "@/lib/accounts/cash-balance";

describe("computeAccountCashBalance", () => {
  const movements = [
    { transaction_date: "2026-01-05", amount: -50000 },
    { transaction_date: "2026-02-10", amount: 1000 },
  ];

  it("returns net from imports when no anchor is set", () => {
    expect(
      computeAccountCashBalance({
        openingBalance: null,
        openingBalanceDate: null,
        movements,
      })
    ).toEqual({
      balance: -49000,
      movementNet: -49000,
      hasAnchor: false,
    });
  });

  it("adds movements on or after the anchor date", () => {
    expect(
      computeAccountCashBalance({
        openingBalance: 52000,
        openingBalanceDate: "2026-02-01",
        movements,
      })
    ).toEqual({
      balance: 53000,
      movementNet: 1000,
      hasAnchor: true,
    });
  });
});
