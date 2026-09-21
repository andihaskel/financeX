import type { TransactionForAccounting } from "@/lib/accounting/calculations";
import { getSpendingContributionUsd, isSpendingTransaction } from "@/lib/accounting/calculations";

export interface RefundLinkRecord {
  id?: string;
  transaction_date: string;
  transaction_type: string;
  refunds_transaction_id?: string | null;
}

export interface RefundLinkContext {
  expenseDateById: Map<string, string>;
}

export function buildRefundLinkContext(records: RefundLinkRecord[]): RefundLinkContext {
  const expenseDateById = new Map<string, string>();
  for (const record of records) {
    if (record.transaction_type === "expense" && record.id) {
      expenseDateById.set(record.id, record.transaction_date);
    }
  }
  return { expenseDateById };
}

export type LinkedTransactionForAccounting = TransactionForAccounting & {
  id?: string;
  transaction_date: string;
  transaction_type: string;
  refunds_transaction_id?: string | null;
};

export function getAttributedSpendingContributionUsd(
  transaction: LinkedTransactionForAccounting,
  viewingMonth: string,
  uyuToUsdRate: number,
  context: RefundLinkContext
): number {
  if (
    transaction.transaction_type === "refund" &&
    transaction.refunds_transaction_id
  ) {
    const expenseDate = context.expenseDateById.get(transaction.refunds_transaction_id);
    if (!expenseDate) {
      return getSpendingContributionUsd(transaction, uyuToUsdRate);
    }

    const expenseMonth = expenseDate.slice(0, 7);
    const refundMonth = transaction.transaction_date.slice(0, 7);

    if (viewingMonth === expenseMonth) {
      return getSpendingContributionUsd(transaction, uyuToUsdRate);
    }

    if (viewingMonth === refundMonth) {
      return 0;
    }

    return 0;
  }

  return getSpendingContributionUsd(transaction, uyuToUsdRate);
}

function attributedContribution(
  transaction: LinkedTransactionForAccounting,
  viewingMonth: string,
  uyuToUsdRate: number,
  context: RefundLinkContext,
  predicate: (transaction: LinkedTransactionForAccounting) => boolean
): number {
  if (!isSpendingTransaction(transaction) || !predicate(transaction)) return 0;
  return getAttributedSpendingContributionUsd(
    transaction,
    viewingMonth,
    uyuToUsdRate,
    context
  );
}

function sumAttributedContributions(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  uyuToUsdRate: number,
  predicate: (transaction: LinkedTransactionForAccounting) => boolean
): number {
  const context = buildRefundLinkContext(linkPool);
  const inMonthIds = new Set(inMonthTransactions.map((tx) => tx.id).filter(Boolean));

  let total = inMonthTransactions.reduce(
    (sum, transaction) =>
      sum +
      attributedContribution(transaction, viewingMonth, uyuToUsdRate, context, predicate),
    0
  );

  for (const transaction of linkPool) {
    if (transaction.transaction_type !== "refund" || !transaction.refunds_transaction_id) {
      continue;
    }
    if (!transaction.id || inMonthIds.has(transaction.id)) continue;

    const expenseDate = context.expenseDateById.get(transaction.refunds_transaction_id);
    if (!expenseDate || expenseDate.slice(0, 7) !== viewingMonth) continue;

    total += attributedContribution(
      transaction,
      viewingMonth,
      uyuToUsdRate,
      context,
      predicate
    );
  }

  return total;
}

export function calculateAttributedTotalSpending(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  uyuToUsdRate: number
): number {
  return sumAttributedContributions(
    viewingMonth,
    inMonthTransactions,
    linkPool,
    uyuToUsdRate,
    () => true
  );
}

export function calculateAttributedCoreLivingExpenses(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  categories: { id: string; group: string }[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return sumAttributedContributions(
    viewingMonth,
    inMonthTransactions,
    linkPool,
    uyuToUsdRate,
    (transaction) => {
      if (transaction.is_extraordinary) return false;
      const category = transaction.category_id
        ? categoryMap.get(transaction.category_id)
        : null;
      return category?.group !== "extraordinary";
    }
  );
}

export function calculateAttributedExtraordinarySpending(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  categories: { id: string; group: string }[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return sumAttributedContributions(
    viewingMonth,
    inMonthTransactions,
    linkPool,
    uyuToUsdRate,
    (transaction) => {
      const category = transaction.category_id
        ? categoryMap.get(transaction.category_id)
        : null;
      return Boolean(
        transaction.is_extraordinary || category?.group === "extraordinary"
      );
    }
  );
}

export function calculateAttributedDiscretionarySpending(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  categories: { id: string; group: string }[],
  uyuToUsdRate: number
): number {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return sumAttributedContributions(
    viewingMonth,
    inMonthTransactions,
    linkPool,
    uyuToUsdRate,
    (transaction) => {
      const category = transaction.category_id
        ? categoryMap.get(transaction.category_id)
        : null;
      return category?.group === "discretionary";
    }
  );
}

export function groupAttributedSpendingByCategory(
  viewingMonth: string,
  inMonthTransactions: LinkedTransactionForAccounting[],
  linkPool: LinkedTransactionForAccounting[],
  categories: { id: string; name: string }[],
  uyuToUsdRate: number
): { categoryId: string; name: string; amount: number }[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const context = buildRefundLinkContext(linkPool);
  const inMonthIds = new Set(inMonthTransactions.map((tx) => tx.id).filter(Boolean));
  const totals = new Map<string, number>();

  function add(transaction: LinkedTransactionForAccounting) {
    if (!transaction.category_id || !isSpendingTransaction(transaction)) return;
    const contribution = getAttributedSpendingContributionUsd(
      transaction,
      viewingMonth,
      uyuToUsdRate,
      context
    );
    totals.set(
      transaction.category_id,
      (totals.get(transaction.category_id) ?? 0) + contribution
    );
  }

  for (const transaction of inMonthTransactions) {
    add(transaction);
  }

  for (const transaction of linkPool) {
    if (transaction.transaction_type !== "refund" || !transaction.refunds_transaction_id) {
      continue;
    }
    if (!transaction.id || inMonthIds.has(transaction.id)) continue;
    const expenseDate = context.expenseDateById.get(transaction.refunds_transaction_id);
    if (!expenseDate || expenseDate.slice(0, 7) !== viewingMonth) continue;
    add(transaction);
  }

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryMap.get(categoryId) ?? "Unknown",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}
