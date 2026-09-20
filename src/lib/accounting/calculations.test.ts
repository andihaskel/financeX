import { describe, expect, it } from "vitest";

import {
  calculateCoreLivingExpenses,
  calculateExtraordinarySpending,
  calculateIncome,
  calculateSavings,
  calculateSavingsRate,
  calculateTotalSpending,
} from "@/lib/accounting/calculations";
import { categorizeTransaction } from "@/lib/categorization/categorize";
import {
  generateTransactionFingerprint,
  normalizeDescription,
} from "@/lib/categorization/normalize";
import { convertToUsd } from "@/lib/currency/convert";
import type { CategorizationRule, Category } from "@/types/database";

const UYU_RATE = 40;

const categories: Pick<Category, "id" | "group">[] = [
  { id: "food", group: "essential" },
  { id: "travel", group: "extraordinary" },
];

describe("credit card payment exclusion", () => {
  it("counts only the purchase, not the payment", () => {
    const transactions = [
      { amount: -100, currency: "USD" as const, transaction_type: "expense" as const, excluded_from_spending: false, is_extraordinary: false, category_id: "food" },
      { amount: -100, currency: "USD" as const, transaction_type: "credit_card_payment" as const, excluded_from_spending: true, is_extraordinary: false, category_id: null },
    ];

    expect(calculateTotalSpending(transactions, UYU_RATE)).toBe(100);
  });
});

describe("own transfer exclusion", () => {
  it("does not count transfers as spending or income", () => {
    const transactions = [
      { amount: -1000, currency: "USD" as const, transaction_type: "transfer" as const, excluded_from_spending: true, is_extraordinary: false, category_id: null },
      { amount: 1000, currency: "USD" as const, transaction_type: "transfer" as const, excluded_from_spending: true, is_extraordinary: false, category_id: null },
    ];

    expect(calculateTotalSpending(transactions, UYU_RATE)).toBe(0);
    expect(calculateIncome(transactions, UYU_RATE)).toBe(0);
  });
});

describe("refunds", () => {
  it("reduces net spending", () => {
    const transactions = [
      { amount: -100, currency: "USD" as const, transaction_type: "expense" as const, excluded_from_spending: false, is_extraordinary: false, category_id: "food" },
      { amount: 20, currency: "USD" as const, transaction_type: "refund" as const, excluded_from_spending: false, is_extraordinary: false, category_id: "food" },
    ];

    expect(calculateTotalSpending(transactions, UYU_RATE)).toBe(80);
  });
});

describe("travel / core living split", () => {
  it("separates extraordinary travel from core living", () => {
    const transactions = [
      { amount: -4000, currency: "USD" as const, transaction_type: "expense" as const, excluded_from_spending: false, is_extraordinary: false, category_id: "food" },
      { amount: -1500, currency: "USD" as const, transaction_type: "expense" as const, excluded_from_spending: false, is_extraordinary: true, category_id: "travel" },
    ];

    expect(calculateTotalSpending(transactions, UYU_RATE)).toBe(5500);
    expect(calculateCoreLivingExpenses(transactions, categories, UYU_RATE)).toBe(4000);
    expect(calculateExtraordinarySpending(transactions, categories, UYU_RATE)).toBe(1500);
  });
});

describe("savings", () => {
  it("calculates savings and rate correctly", () => {
    const income = 8756;
    const expenses = 5766;
    const savings = calculateSavings(income, expenses);
    const rate = calculateSavingsRate(income, savings);

    expect(savings).toBe(2990);
    expect(rate).toBeCloseTo(0.341, 2);
  });
});

describe("multi-currency conversion", () => {
  it("converts UYU to USD using configured rate", () => {
    expect(convertToUsd(4000, "UYU", 40)).toBe(100);
    expect(convertToUsd(100, "USD", 40)).toBe(100);
  });
});

describe("duplicate detection", () => {
  it("generates stable fingerprints", () => {
    const input = {
      accountId: "acc-1",
      transactionDate: "2026-08-01",
      amount: -50.25,
      normalizedDescription: "PEDIDOSYA",
    };

    const fp1 = generateTransactionFingerprint(input);
    const fp2 = generateTransactionFingerprint(input);
    const fp3 = generateTransactionFingerprint({ ...input, amount: -50.26 });

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });
});

describe("categorization rule priority", () => {
  const rules: CategorizationRule[] = [
    {
      id: "1",
      user_id: "u",
      name: "Transfer",
      match_type: "contains",
      pattern: "T--",
      transaction_type: "transfer",
      category_id: null,
      excluded_from_spending: true,
      is_recurring: false,
      is_extraordinary: false,
      priority: 1,
      active: true,
      created_at: "",
    },
    {
      id: "2",
      user_id: "u",
      name: "PedidosYa",
      match_type: "contains",
      pattern: "PEDIDOSYA",
      transaction_type: "expense",
      category_id: "food",
      excluded_from_spending: false,
      is_recurring: false,
      is_extraordinary: false,
      priority: 10,
      active: true,
      created_at: "",
    },
  ];

  it("applies higher priority exclusion rules first", () => {
    const result = categorizeTransaction(
      { normalized_description: "T-- TRANSFER", amount: -100 },
      rules
    );

    expect(result.transaction_type).toBe("transfer");
    expect(result.excluded_from_spending).toBe(true);
  });

  it("applies merchant rules when no exclusion matches", () => {
    const result = categorizeTransaction(
      { normalized_description: "PEDIDOSYA PLUS", amount: -25 },
      rules
    );

    expect(result.category_id).toBe("food");
  });
});

describe("normalization", () => {
  it("cleans Santander descriptions", () => {
    expect(
      normalizeDescription("COMPRA CON TARJETA DEBITO DLO.PEDIDOSYA PLUS")
    ).toBe("PEDIDOSYA PLUS");
  });
});
