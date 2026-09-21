import type { SupabaseClient } from "@supabase/supabase-js";

import type { LinkedTransactionForAccounting } from "@/lib/accounting/refund-links";
import type { Transaction } from "@/types/database";

const LINK_FIELDS =
  "id, transaction_date, amount, currency, transaction_type, excluded_from_spending, is_extraordinary, category_id, refunds_transaction_id, account_id";

function asLinked(transactions: Transaction[]): LinkedTransactionForAccounting[] {
  return transactions;
}

function dedupeById(transactions: LinkedTransactionForAccounting[]) {
  const map = new Map<string, LinkedTransactionForAccounting>();
  for (const transaction of transactions) {
    if (transaction.id) map.set(transaction.id, transaction);
  }
  return [...map.values()];
}

export async function buildMonthRefundLinkPool(
  supabase: SupabaseClient,
  userId: string,
  monthTransactions: Transaction[]
): Promise<LinkedTransactionForAccounting[]> {
  const monthExpenseIds = monthTransactions
    .filter((tx) => tx.transaction_type === "expense")
    .map((tx) => tx.id);

  const linkedExpenseIds = [
    ...new Set(
      monthTransactions
        .map((tx) => tx.refunds_transaction_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [inboundRefundsResult, linkedExpensesResult] = await Promise.all([
    monthExpenseIds.length > 0
      ? supabase
          .from("transactions")
          .select(LINK_FIELDS)
          .eq("user_id", userId)
          .eq("transaction_type", "refund")
          .in("refunds_transaction_id", monthExpenseIds)
      : Promise.resolve({ data: [] }),
    linkedExpenseIds.length > 0
      ? supabase
          .from("transactions")
          .select(LINK_FIELDS)
          .eq("user_id", userId)
          .in("id", linkedExpenseIds)
      : Promise.resolve({ data: [] }),
  ]);

  return dedupeById([
    ...asLinked(monthTransactions),
    ...asLinked((inboundRefundsResult.data ?? []) as Transaction[]),
    ...asLinked((linkedExpensesResult.data ?? []) as Transaction[]),
  ]);
}

export async function fetchYearTransactionsWithRefundLinks(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<LinkedTransactionForAccounting[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data } = await supabase
    .from("transactions")
    .select(LINK_FIELDS)
    .eq("user_id", userId)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  const yearTransactions = (data ?? []) as Transaction[];
  const expenseIds = yearTransactions
    .filter((tx) => tx.transaction_type === "expense")
    .map((tx) => tx.id);

  if (expenseIds.length === 0) {
    return asLinked(yearTransactions);
  }

  const { data: inboundRefunds } = await supabase
    .from("transactions")
    .select(LINK_FIELDS)
    .eq("user_id", userId)
    .eq("transaction_type", "refund")
    .in("refunds_transaction_id", expenseIds)
    .or(`transaction_date.lt.${start},transaction_date.gt.${end}`);

  return dedupeById([
    ...asLinked(yearTransactions),
    ...asLinked((inboundRefunds ?? []) as Transaction[]),
  ]);
}
