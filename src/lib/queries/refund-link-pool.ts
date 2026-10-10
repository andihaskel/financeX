import type { SupabaseClient } from "@supabase/supabase-js";

import type { LinkedTransactionForAccounting } from "@/lib/accounting/refund-links";
import type { Transaction } from "@/types/database";

const LINK_FIELDS =
  "id, transaction_date, amount, currency, transaction_type, excluded_from_spending, is_extraordinary, category_id, refunds_transaction_id, account_id, income_principal_amount";

/** PostgREST default max rows; page explicitly so year summaries are complete. */
const PAGE_SIZE = 1000;
/** Keep `.in(...)` URL/body sizes under practical PostgREST limits. */
const IN_BATCH_SIZE = 200;

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

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function selectTransactionsByIds(
  supabase: SupabaseClient,
  userId: string,
  ids: string[]
): Promise<Transaction[]> {
  if (ids.length === 0) return [];

  const pages = await Promise.all(
    chunkIds(ids, IN_BATCH_SIZE).map(async (batch) => {
      const { data, error } = await supabase
        .from("transactions")
        .select(LINK_FIELDS)
        .eq("user_id", userId)
        .in("id", batch);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    })
  );

  return pages.flat();
}

async function selectRefundsForExpenseIds(
  supabase: SupabaseClient,
  userId: string,
  expenseIds: string[],
  options?: { outsideDateRange?: { start: string; end: string } }
): Promise<Transaction[]> {
  if (expenseIds.length === 0) return [];

  const pages = await Promise.all(
    chunkIds(expenseIds, IN_BATCH_SIZE).map(async (batch) => {
      let query = supabase
        .from("transactions")
        .select(LINK_FIELDS)
        .eq("user_id", userId)
        .eq("transaction_type", "refund")
        .in("refunds_transaction_id", batch);

      if (options?.outsideDateRange) {
        const { start, end } = options.outsideDateRange;
        query = query.or(`transaction_date.lt.${start},transaction_date.gt.${end}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    })
  );

  return pages.flat();
}

async function fetchYearDatedTransactions(
  supabase: SupabaseClient,
  userId: string,
  start: string,
  end: string
): Promise<Transaction[]> {
  const rows: Transaction[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("transactions")
      .select(LINK_FIELDS)
      .eq("user_id", userId)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as Transaction[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
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

  const [inboundRefunds, linkedExpenses] = await Promise.all([
    selectRefundsForExpenseIds(supabase, userId, monthExpenseIds),
    selectTransactionsByIds(supabase, userId, linkedExpenseIds),
  ]);

  return dedupeById([
    ...asLinked(monthTransactions),
    ...asLinked(inboundRefunds),
    ...asLinked(linkedExpenses),
  ]);
}

export async function fetchYearTransactionsWithRefundLinks(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<LinkedTransactionForAccounting[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const yearTransactions = await fetchYearDatedTransactions(
    supabase,
    userId,
    start,
    end
  );

  const expenseIds = yearTransactions
    .filter((tx) => tx.transaction_type === "expense")
    .map((tx) => tx.id);

  const linkedExpenseIds = [
    ...new Set(
      yearTransactions
        .map((tx) => tx.refunds_transaction_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [inboundRefunds, linkedExpenses] = await Promise.all([
    selectRefundsForExpenseIds(supabase, userId, expenseIds, {
      outsideDateRange: { start, end },
    }),
    selectTransactionsByIds(supabase, userId, linkedExpenseIds),
  ]);

  return dedupeById([
    ...asLinked(yearTransactions),
    ...asLinked(inboundRefunds),
    ...asLinked(linkedExpenses),
  ]);
}
