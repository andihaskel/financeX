import { describe, expect, it } from "vitest";

import { calculateIncome } from "@/lib/accounting/calculations";
import {
  buildIncomeWealthPositionAdjustments,
  getIncomeInterestAmount,
  resolveIncomeWealthLink,
} from "@/lib/accounting/income-wealth";

const UYU_RATE = 40;

describe("resolveIncomeWealthLink", () => {
  it("clears link when type is not income", () => {
    const result = resolveIncomeWealthLink({
      nextType: "expense",
      amount: 1000,
      existing: {
        income_wealth_position_id: "pos-1",
        income_principal_amount: 800,
      },
    });

    expect(result).toEqual({
      link: {
        income_wealth_position_id: null,
        income_principal_amount: null,
      },
    });
  });

  it("rejects capital without a position", () => {
    const result = resolveIncomeWealthLink({
      nextType: "income",
      amount: 1000,
      positionId: null,
      principalAmount: 500,
    });

    expect(result).toEqual({ error: "Choose a wealth position for the capital portion" });
  });

  it("stores principal split for linked income", () => {
    const result = resolveIncomeWealthLink({
      nextType: "income",
      amount: 1000,
      positionId: "pos-1",
      principalAmount: 800,
    });

    expect(result).toEqual({
      link: {
        income_wealth_position_id: "pos-1",
        income_principal_amount: 800,
      },
    });
  });
});

describe("getIncomeInterestAmount", () => {
  it("returns payment minus principal", () => {
    expect(
      getIncomeInterestAmount({ amount: 1000, income_principal_amount: 800 })
    ).toBe(200);
  });

  it("treats missing principal as full income", () => {
    expect(getIncomeInterestAmount({ amount: 1000 })).toBe(1000);
  });
});

describe("buildIncomeWealthPositionAdjustments", () => {
  it("reduces position by converted principal", () => {
    const positions = new Map([
      ["pos-1", { amount: 50000, currency: "USD" as const }],
    ]);

    const result = buildIncomeWealthPositionAdjustments({
      existingPositionId: null,
      existingPrincipal: 0,
      existingTxCurrency: "USD",
      nextPositionId: "pos-1",
      nextPrincipal: 800,
      nextTxCurrency: "USD",
      positions,
      uyuRate: UYU_RATE,
    });

    expect(result).toEqual({
      adjustments: [{ positionId: "pos-1", delta: -800 }],
    });
  });

  it("reverts old principal when relinking", () => {
    const positions = new Map([
      ["pos-1", { amount: 42000, currency: "USD" as const }],
      ["pos-2", { amount: 10000, currency: "USD" as const }],
    ]);

    const result = buildIncomeWealthPositionAdjustments({
      existingPositionId: "pos-1",
      existingPrincipal: 800,
      existingTxCurrency: "USD",
      nextPositionId: "pos-2",
      nextPrincipal: 500,
      nextTxCurrency: "USD",
      positions,
      uyuRate: UYU_RATE,
    });

    expect(result).toEqual({
      adjustments: [
        { positionId: "pos-1", delta: 800 },
        { positionId: "pos-2", delta: -500 },
      ],
    });
  });
});

describe("calculateIncome with principal split", () => {
  it("counts only interest as income", () => {
    const income = calculateIncome(
      [
        {
          amount: 1000,
          currency: "USD",
          transaction_type: "income",
          excluded_from_spending: false,
          is_extraordinary: false,
          category_id: "renta-fija",
          income_principal_amount: 800,
        },
      ],
      UYU_RATE
    );

    expect(income).toBe(200);
  });
});
