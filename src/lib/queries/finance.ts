import { convertToUsd } from "@/lib/currency/convert";
import { format, subMonths } from "date-fns";
import { cache } from "react";

import {
  calculateCoreLivingExpenses,
  calculateDiscretionarySpending,
  calculateExtraordinarySpending,
  calculateIncome,
  calculateSavings,
  calculateSavingsRate,
  calculateTotalSpending,
  getTransactionUsdAmount,
  groupSpendingByCategory,
} from "@/lib/accounting/calculations";
import { dedupeAccounts, sortAccounts } from "@/lib/accounts/helpers";
import { spendingCategories } from "@/lib/categories/helpers";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Account, Category, Import, Transaction, UserSettings } from "@/types/database";

import { getMonthDateRange } from "@/components/dashboard/month-nav";

function sumIncomeBySlugs(
  transactions: Transaction[],
  categories: Category[],
  uyuToUsdRate: number,
  slugs: string[]
) {
  const slugSet = new Set(slugs);
  const matchingIds = new Set(
    categories.filter((category) => slugSet.has(category.slug)).map((category) => category.id)
  );

  return transactions
    .filter(
      (transaction) =>
        transaction.transaction_type === "income" &&
        !transaction.excluded_from_spending &&
        transaction.category_id &&
        matchingIds.has(transaction.category_id)
    )
    .reduce(
      (sum, transaction) => sum + Math.abs(getTransactionUsdAmount(transaction, uyuToUsdRate)),
      0
    );
}

type BudgetClient = Awaited<ReturnType<typeof createClient>>;

async function resolveBudgetAmountsForMonth(
  supabase: BudgetClient,
  userId: string,
  monthStart: string
): Promise<Map<string, number>> {
  const { data: monthBudgets } = await supabase
    .from("monthly_budgets")
    .select("category_id, budget_amount")
    .eq("user_id", userId)
    .eq("month", monthStart);

  if (monthBudgets && monthBudgets.length > 0) {
    return new Map(
      monthBudgets.map((b: { category_id: string; budget_amount: number }) => [
        b.category_id,
        Number(b.budget_amount),
      ])
    );
  }

  const { data: latestBudget } = await supabase
    .from("monthly_budgets")
    .select("month")
    .eq("user_id", userId)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestBudget?.month) return new Map();

  const { data: fallbackBudgets } = await supabase
    .from("monthly_budgets")
    .select("category_id, budget_amount")
    .eq("user_id", userId)
    .eq("month", latestBudget.month);

  return new Map(
    (fallbackBudgets ?? []).map((b: { category_id: string; budget_amount: number }) => [
      b.category_id,
      Number(b.budget_amount),
    ])
  );
}

export const getUserSettings = cache(async (): Promise<UserSettings | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data as UserSettings | null;
});

export async function getMonthTransactions(month: string) {
  const user = await getUser();
  if (!user) return { transactions: [], categories: [], settings: null };

  const supabase = await createClient();
  const { start, end } = getMonthDateRange(month);

  const [txResult, catResult, settingsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("active", true),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
  ]);

  return {
    transactions: (txResult.data ?? []) as Transaction[],
    categories: (catResult.data ?? []) as Category[],
    settings: settingsResult.data as UserSettings | null,
  };
}

export async function getDashboardMetrics(month: string) {
  const { transactions, categories, settings } = await getMonthTransactions(month);
  const uyuRate = settings?.uyu_to_usd_rate ?? 40;
  const savingsTarget = (settings?.savings_target_percent ?? 40) / 100;

  const income = calculateIncome(transactions, uyuRate);
  const totalSpending = calculateTotalSpending(transactions, uyuRate);
  const coreLiving = calculateCoreLivingExpenses(transactions, categories, uyuRate);
  const extraordinary = calculateExtraordinarySpending(transactions, categories, uyuRate);
  const discretionary = calculateDiscretionarySpending(transactions, categories, uyuRate);
  const savings = calculateSavings(income, totalSpending);
  const savingsRate = calculateSavingsRate(income, savings);
  const spendingByCategory = groupSpendingByCategory(transactions, categories, uyuRate);

  const salaryIncome = sumIncomeBySlugs(transactions, categories, uyuRate, ["sueldo"]);
  const propertyIncome = sumIncomeBySlugs(transactions, categories, uyuRate, [
    "renta-fija",
    "renta-variable",
  ]);
  const categorizedIncome = salaryIncome + propertyIncome;
  const otherIncome = Math.max(0, income - categorizedIncome);

  return {
    income,
    totalSpending,
    coreLiving,
    extraordinary,
    discretionary,
    savings,
    savingsRate,
    savingsTarget,
    salaryIncome,
    propertyIncome,
    otherIncome,
    spendingByCategory,
    uyuRate,
  };
}

export async function getBudgetComparison(month: string) {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const monthStart = `${month}-01`;
  const { transactions, categories, settings } = await getMonthTransactions(month);
  const uyuRate = settings?.uyu_to_usd_rate ?? 40;

  const budgetMap = await resolveBudgetAmountsForMonth(supabase, user.id, monthStart);
  const actuals = groupSpendingByCategory(transactions, categories, uyuRate);
  const actualMap = new Map(actuals.map((a) => [a.categoryId, a.amount]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const categoryIds = new Set<string>([
    ...actuals.map((a) => a.categoryId),
    ...budgetMap.keys(),
  ]);

  return Array.from(categoryIds)
    .map((categoryId) => {
      const category = categoryById.get(categoryId);
      const actual = actualMap.get(categoryId) ?? 0;
      return {
        categoryId,
        name: category?.name ?? actuals.find((a) => a.categoryId === categoryId)?.name ?? "Unknown",
        slug: category?.slug ?? "otros",
        group: category?.group,
        budget: budgetMap.get(categoryId) ?? 0,
        actual,
      };
    })
    .filter((row) => row.group !== "income")
    .filter((row) => row.actual > 0 || row.budget > 0)
    .sort((a, b) => b.actual - a.actual);
}

export async function getTargetBudgets(month: string) {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const monthStart = `${month}-01`;

  const [{ data: categories }, budgetMap] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, group")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name"),
    resolveBudgetAmountsForMonth(supabase, user.id, monthStart),
  ]);

  return spendingCategories(categories ?? []).map(
    (cat: { id: string; name: string; slug: string }) => ({
      categoryId: cat.id,
      name: cat.name,
      slug: cat.slug,
      budget: budgetMap.get(cat.id) ?? 0,
    })
  );
}

export async function getTargetSummary(month: string) {
  const user = await getUser();
  if (!user) {
    return { expectedIncome: 0, targetToSpend: 0, goalToSave: 0, savingsPercent: 40 };
  }

  const supabase = await createClient();
  const [incomeResult, settingsResult, budgetData] = await Promise.all([
    supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
    getTargetBudgets(month),
  ]);

  const uyuRate = settingsResult.data?.uyu_to_usd_rate ?? 40;
  const savingsPercent = settingsResult.data?.savings_target_percent ?? 40;

  const expectedIncome = (incomeResult.data ?? []).reduce((sum, source) => {
    return (
      sum +
      convertToUsd(source.expected_monthly_amount, source.currency, uyuRate)
    );
  }, 0);

  const targetToSpend = budgetData.reduce((sum, row) => sum + row.budget, 0);
  const goalToSave = expectedIncome * (savingsPercent / 100);

  return { expectedIncome, targetToSpend, goalToSave, savingsPercent };
}

export async function getMonthlyTrend(currentMonth: string) {
  const user = await getUser();
  if (!user) return [];

  const months: string[] = [];
  const base = new Date(`${currentMonth}-01`);
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(base, i), "yyyy-MM"));
  }

  const results = await Promise.all(
    months.map(async (month) => {
      const metrics = await getDashboardMetrics(month);
      return {
        month: format(new Date(`${month}-01`), "MMM"),
        income: Math.round(metrics.income),
        expenses: Math.round(metrics.totalSpending),
        savings: Math.round(metrics.savings),
      };
    })
  );

  return results;
}

export const getAccounts = cache(async () => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("name");

  return dedupeAccounts((data ?? []) as Account[]);
});

export const getCategories = cache(async () => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("name");

  return (data ?? []) as Category[];
});

export async function getImports(): Promise<Import[]> {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("imports")
    .select("*")
    .eq("user_id", user.id)
    .order("imported_at", { ascending: false });

  return (data ?? []) as Import[];
}
