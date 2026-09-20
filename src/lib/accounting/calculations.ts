import type { Category, Transaction, TransactionType } from "@/types/database";

import { convertToUsd } from "@/lib/currency/convert";

export interface TransactionForAccounting {
  amount: number;
  currency: "USD" | "UYU";
  transaction_type: TransactionType;
  excluded_from_spending: boolean;
  is_extraordinary: boolean;
  category_id: string | null;
}

const SPENDING_TYPES: TransactionType[] = ["expense", "refund"];

export function isSpendingTransaction(transaction: TransactionForAccounting): boolean {
  if (transaction.excluded_from_spending) return false;
  return SPENDING_TYPES.includes(transaction.transaction_type);
}

export function getTransactionUsdAmount(
  transaction: TransactionForAccounting,
  uyuToUsdRate: number
): number {
  return convertToUsd(transaction.amount, transaction.currency, uyuToUsdRate);
}

/** Expenses are negative; refunds are positive. Net spending uses absolute expense minus refunds. */
export function getSpendingContributionUsd(
  transaction: TransactionForAccounting,
  uyuToUsdRate: number
): number {
  if (!isSpendingTransaction(transaction)) return 0;

  const usdAmount = getTransactionUsdAmount(transaction, uyuToUsdRate);

  if (transaction.transaction_type === "refund") {
    return -usdAmount;
  }

  return Math.abs(usdAmount);
}

export function calculateTotalSpending(
  transactions: TransactionForAccounting[],
  uyuToUsdRate: number
): number {
  return transactions.reduce(
    (total, transaction) =>
      total + getSpendingContributionUsd(transaction, uyuToUsdRate),
    0
  );
}

export function calculateIncome(
  transactions: TransactionForAccounting[],
  uyuToUsdRate: number
): number {
  return transactions
    .filter(
      (t) =>
        t.transaction_type === "income" && !t.excluded_from_spending
    )
    .reduce(
      (total, t) => total + Math.abs(getTransactionUsdAmount(t, uyuToUsdRate)),
      0
    );
}

export function calculateCoreLivingExpenses(
  transactions: TransactionForAccounting[],
  categories: Pick<Category, "id" | "group">[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return transactions.reduce((total, transaction) => {
    if (!isSpendingTransaction(transaction)) return total;
    if (transaction.is_extraordinary) return total;

    const category = transaction.category_id
      ? categoryMap.get(transaction.category_id)
      : null;
    if (category?.group === "extraordinary") return total;

    return total + getSpendingContributionUsd(transaction, uyuToUsdRate);
  }, 0);
}

export function calculateExtraordinarySpending(
  transactions: TransactionForAccounting[],
  categories: Pick<Category, "id" | "group">[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return transactions.reduce((total, transaction) => {
    if (!isSpendingTransaction(transaction)) return total;

    const category = transaction.category_id
      ? categoryMap.get(transaction.category_id)
      : null;
    const isExtraordinary =
      transaction.is_extraordinary || category?.group === "extraordinary";

    if (!isExtraordinary) return total;
    return total + getSpendingContributionUsd(transaction, uyuToUsdRate);
  }, 0);
}

export function calculateDiscretionarySpending(
  transactions: TransactionForAccounting[],
  categories: Pick<Category, "id" | "group">[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return transactions.reduce((total, transaction) => {
    if (!isSpendingTransaction(transaction)) return total;

    const category = transaction.category_id
      ? categoryMap.get(transaction.category_id)
      : null;
    if (category?.group !== "discretionary") return total;

    return total + getSpendingContributionUsd(transaction, uyuToUsdRate);
  }, 0);
}

export function calculateSavings(income: number, totalSpending: number): number {
  return income - totalSpending;
}

export function calculateSavingsRate(income: number, savings: number): number {
  if (income <= 0) return 0;
  return savings / income;
}

export function groupSpendingByCategory(
  transactions: TransactionForAccounting[],
  categories: Pick<Category, "id" | "name">[],
  uyuToUsdRate: number
): { categoryId: string; name: string; amount: number }[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (!isSpendingTransaction(transaction) || !transaction.category_id) continue;
    const contribution = getSpendingContributionUsd(transaction, uyuToUsdRate);
    totals.set(
      transaction.category_id,
      (totals.get(transaction.category_id) ?? 0) + contribution
    );
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryMap.get(categoryId) ?? "Unknown",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}
