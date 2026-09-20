import { format, parseISO } from "date-fns";
import { cache } from "react";

import {
  calculateCoreLivingExpenses,
  calculateExtraordinarySpending,
  calculateIncome,
  calculateSavings,
  calculateSavingsRate,
  calculateTotalSpending,
  groupSpendingByCategory,
} from "@/lib/accounting/calculations";
import {
  dedupeAccounts,
  getAccountDisplayName,
  getAccountShortLabel,
} from "@/lib/accounts/helpers";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/types/database";

import { getUserSettings } from "./finance";
import type { AccountImportStatus } from "./import-coverage";

export interface MonthSummary {
  month: string;
  label: string;
  short: string;
  hasData: boolean;
  income: number;
  spent: number;
  saved: number;
  savingsRate: number;
  usual: number;
  extra: number;
}

export interface YearSummary {
  year: number;
  months: MonthSummary[];
  totalIncome: number;
  totalSpent: number;
  totalSaved: number;
  savingsRate: number;
  avgSpending: number;
  avgUsual: number;
  totalExtra: number;
}

export interface AnnualCategoryTotal {
  categoryId: string;
  name: string;
  slug: string;
  amount: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function emptyYear(year: number): YearSummary {
  return {
    year,
    months: MONTH_NAMES.map((name, i) => ({
      month: `${year}-${String(i + 1).padStart(2, "0")}`,
      label: name,
      short: format(parseISO(`${year}-${String(i + 1).padStart(2, "0")}-01`), "MMM"),
      hasData: false,
      income: 0,
      spent: 0,
      saved: 0,
      savingsRate: 0,
      usual: 0,
      extra: 0,
    })),
    totalIncome: 0,
    totalSpent: 0,
    totalSaved: 0,
    savingsRate: 0,
    avgSpending: 0,
    avgUsual: 0,
    totalExtra: 0,
  };
}

function buildYearSummary(
  year: number,
  transactions: Transaction[],
  categories: Category[],
  uyuRate: number
): YearSummary {
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const m = tx.transaction_date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(tx);
  }

  const months: MonthSummary[] = MONTH_NAMES.map((name, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const monthTx = byMonth.get(month) ?? [];
    const hasData = monthTx.length > 0;
    const income = calculateIncome(monthTx, uyuRate);
    const spent = calculateTotalSpending(monthTx, uyuRate);
    const usual = calculateCoreLivingExpenses(monthTx, categories, uyuRate);
    const extra = calculateExtraordinarySpending(monthTx, categories, uyuRate);
    const saved = calculateSavings(income, spent);
    const savingsRate = calculateSavingsRate(income, saved);

    return {
      month,
      label: name,
      short: format(parseISO(`${month}-01`), "MMM"),
      hasData,
      income,
      spent,
      saved,
      savingsRate,
      usual,
      extra,
    };
  });

  const dataMonths = months.filter((m) => m.hasData);
  const totalIncome = dataMonths.reduce((s, m) => s + m.income, 0);
  const totalSpent = dataMonths.reduce((s, m) => s + m.spent, 0);
  const totalSaved = totalIncome - totalSpent;

  return {
    year,
    months,
    totalIncome,
    totalSpent,
    totalSaved,
    savingsRate: calculateSavingsRate(totalIncome, totalSaved),
    avgSpending: dataMonths.length ? totalSpent / dataMonths.length : 0,
    avgUsual: dataMonths.length
      ? dataMonths.reduce((s, m) => s + m.usual, 0) / dataMonths.length
      : 0,
    totalExtra: dataMonths.reduce((s, m) => s + m.extra, 0),
  };
}

function buildCoverageMap(
  year: number,
  accounts: Account[],
  transactions: Pick<Transaction, "transaction_date" | "account_id">[]
): Map<string, AccountImportStatus[]> {
  const map = new Map<string, AccountImportStatus[]>();
  const sortedAccounts = dedupeAccounts(accounts);
  const accountBucketImported = new Map<string, Set<string>>();

  for (const tx of transactions) {
    const monthKey = tx.transaction_date.slice(0, 7);
    const account = accounts.find((a) => a.id === tx.account_id);
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

/** One round-trip for Home: year txs + categories + accounts + settings. */
export const getHomeYearData = cache(async (year: number): Promise<{
  summary: YearSummary;
  categories: AnnualCategoryTotal[];
  coverageMap: Map<string, AccountImportStatus[]>;
}> => {
  const user = await getUser();
  if (!user) {
    return {
      summary: emptyYear(year),
      categories: [],
      coverageMap: new Map(),
    };
  }

  const supabase = await createClient();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const [settings, txResult, catResult, accountsResult] = await Promise.all([
    getUserSettings(),
    supabase
      .from("transactions")
      .select(
        "id, transaction_date, amount, currency, transaction_type, excluded_from_spending, is_extraordinary, category_id, account_id"
      )
      .eq("user_id", user.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("active", true),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("active", true),
  ]);

  const uyuRate = settings?.uyu_to_usd_rate ?? 40;
  const transactions = (txResult.data ?? []) as Transaction[];
  const categories = (catResult.data ?? []) as Category[];
  const accounts = (accountsResult.data ?? []) as Account[];

  const summary = buildYearSummary(year, transactions, categories, uyuRate);
  const categoryTotals = groupSpendingByCategory(transactions, categories, uyuRate).map((c) => {
    const cat = categories.find((x) => x.id === c.categoryId);
    return { ...c, slug: cat?.slug ?? "otros" };
  });
  const coverageMap = buildCoverageMap(year, accounts, transactions);

  return { summary, categories: categoryTotals, coverageMap };
});

export async function getYearSummary(year: number): Promise<YearSummary> {
  const { summary } = await getHomeYearData(year);
  return summary;
}

export async function getAnnualCategoryTotals(year: number) {
  const { categories } = await getHomeYearData(year);
  return categories;
}
