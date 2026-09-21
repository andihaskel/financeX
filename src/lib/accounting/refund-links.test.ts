import { describe, expect, it } from "vitest";

import {
  calculateAttributedTotalSpending,
  type LinkedTransactionForAccounting,
} from "@/lib/accounting/refund-links";

const UYU_RATE = 40;

describe("linked refund attribution", () => {
  const marchExpense: LinkedTransactionForAccounting = {
    id: "expense-1",
    transaction_date: "2026-03-15",
    amount: -1000,
    currency: "USD",
    transaction_type: "expense",
    excluded_from_spending: false,
    is_extraordinary: true,
    category_id: "travel",
    refunds_transaction_id: null,
  };

  const aprilRefund: LinkedTransactionForAccounting = {
    id: "refund-1",
    transaction_date: "2026-04-10",
    amount: 1000,
    currency: "USD",
    transaction_type: "refund",
    excluded_from_spending: false,
    is_extraordinary: true,
    category_id: "travel",
    refunds_transaction_id: "expense-1",
  };

  const linkPool = [marchExpense, aprilRefund];

  it("attributes linked refund to the expense month", () => {
    const marchSpent = calculateAttributedTotalSpending(
      "2026-03",
      [marchExpense],
      linkPool,
      UYU_RATE
    );
    const aprilSpent = calculateAttributedTotalSpending(
      "2026-04",
      [aprilRefund],
      linkPool,
      UYU_RATE
    );

    expect(marchSpent).toBe(0);
    expect(aprilSpent).toBe(0);
  });

  it("keeps cash behavior when refund is not linked", () => {
    const unlinkedRefund: LinkedTransactionForAccounting = {
      ...aprilRefund,
      id: "refund-2",
      refunds_transaction_id: null,
    };

    const marchSpent = calculateAttributedTotalSpending(
      "2026-03",
      [marchExpense],
      [marchExpense, unlinkedRefund],
      UYU_RATE
    );
    const aprilSpent = calculateAttributedTotalSpending(
      "2026-04",
      [unlinkedRefund],
      [marchExpense, unlinkedRefund],
      UYU_RATE
    );

    expect(marchSpent).toBe(1000);
    expect(aprilSpent).toBe(-1000);
  });
});
