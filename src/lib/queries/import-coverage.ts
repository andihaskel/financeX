import { format, parseISO } from "date-fns";

import {
  dedupeAccounts,
  getAccountDisplayName,
  getAccountShortLabel,
  sortAccounts,
} from "@/lib/accounts/helpers";
import { getMonthDateRange } from "@/components/dashboard/month-nav";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Account } from "@/types/database";

export interface AccountImportStatus {
  id: string;
  name: string;
  shortLabel: string;
  imported: boolean;
}

export interface MonthImportCoverage {
  month: string;
  monthLabel: string;
  accounts: AccountImportStatus[];
}

function buildCoverage(
  month: string,
  accounts: Account[],
  importedAccountIds: Set<string>
): MonthImportCoverage {
  const canonical = dedupeAccounts(accounts);
  const importedBuckets = new Set<string>();
  for (const account of accounts) {
    if (importedAccountIds.has(account.id)) {
      importedBuckets.add(
        account.type === "credit_card" ? "card" : account.currency
      );
    }
  }

  return {
    month,
    monthLabel: format(parseISO(`${month}-01`), "MMMM yyyy"),
    accounts: canonical.map((account) => ({
      id: account.id,
      name: getAccountDisplayName(account),
      shortLabel: getAccountShortLabel(account),
      imported: importedBuckets.has(
        account.type === "credit_card" ? "card" : account.currency
      ),
    })),
  };
}

async function getImportedAccountIdsForMonth(month: string): Promise<Set<string>> {
  const user = await getUser();
  if (!user) return new Set();

  const supabase = await createClient();
  const { start, end } = getMonthDateRange(month);

  const { data } = await supabase
    .from("transactions")
    .select("account_id")
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  return new Set((data ?? []).map((row: { account_id: string }) => row.account_id));
}

export async function getMonthImportCoverage(month: string): Promise<MonthImportCoverage | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true);

  const importedAccountIds = await getImportedAccountIdsForMonth(month);
  return buildCoverage(month, (accounts ?? []) as Account[], importedAccountIds);
}

export async function getYearImportCoverageMap(
  year: number
): Promise<Map<string, AccountImportStatus[]>> {
  const user = await getUser();
  const map = new Map<string, AccountImportStatus[]>();
  if (!user) return map;

  const supabase = await createClient();
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("active", true),
    supabase
      .from("transactions")
      .select("transaction_date, account_id")
      .eq("user_id", user.id)
      .gte("transaction_date", `${year}-01-01`)
      .lte("transaction_date", `${year}-12-31`),
  ]);

  const sortedAccounts = dedupeAccounts((accounts ?? []) as Account[]);
  const monthAccountSet = new Set<string>();

  for (const tx of transactions ?? []) {
    monthAccountSet.add(`${tx.transaction_date.slice(0, 7)}:${tx.account_id}`);
  }

  const accountBucketImported = new Map<string, Set<string>>();
  for (const tx of transactions ?? []) {
    const monthKey = tx.transaction_date.slice(0, 7);
    const account = (accounts ?? []).find((a: Account) => a.id === tx.account_id);
    if (!account) continue;
    const bucket = account.type === "credit_card" ? "card" : account.currency;
    if (!accountBucketImported.has(monthKey)) {
      accountBucketImported.set(monthKey, new Set());
    }
    accountBucketImported.get(monthKey)!.add(bucket);
  }

  for (let i = 1; i <= 12; i++) {
    const month = `${year}-${String(i).padStart(2, "0")}`;
    const importedBuckets = accountBucketImported.get(month) ?? new Set<string>();
    map.set(
      month,
      sortedAccounts.map((account) => ({
        id: account.id,
        name: getAccountDisplayName(account),
        shortLabel: getAccountShortLabel(account),
        imported: importedBuckets.has(
          account.type === "credit_card" ? "card" : account.currency
        ),
      }))
    );
  }

  return map;
}
