"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { AccountType, CategoryGroup, Currency } from "@/types/database";

export async function updateSettings(data: {
  uyu_to_usd_rate?: number;
  savings_target_percent?: number;
  base_currency?: Currency;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_settings")
    .update(data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/movements");
  revalidatePath("/target");
  return { success: true };
}

export async function createAccount(data: {
  name: string;
  institution: string;
  type: AccountType;
  currency: Currency;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    ...data,
    active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function updateCategory(
  categoryId: string,
  data: { name?: string; group?: CategoryGroup; active?: boolean }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update(data)
    .eq("id", categoryId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/movements");
  revalidatePath("/target");
  return { success: true };
}

export async function updateBudget(
  categoryId: string,
  month: string,
  budgetAmount: number
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase.from("monthly_budgets").upsert(
    {
      user_id: user.id,
      category_id: categoryId,
      month,
      budget_amount: budgetAmount,
      currency: "USD" as Currency,
    },
    { onConflict: "user_id,category_id,month" }
  );

  if (error) return { error: error.message };

  revalidatePath("/target");
  revalidatePath("/home");
  revalidatePath("/month");
  return { success: true };
}

export async function updateBudgets(
  month: string,
  budgets: { categoryId: string; budgetAmount: number }[]
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const rows = budgets.map((row) => ({
    user_id: user.id,
    category_id: row.categoryId,
    month,
    budget_amount: row.budgetAmount,
    currency: "USD" as Currency,
  }));

  const { error } = await supabase.from("monthly_budgets").upsert(rows, {
    onConflict: "user_id,category_id,month",
  });

  if (error) return { error: error.message };

  revalidatePath("/target");
  revalidatePath("/target/annual");
  revalidatePath("/home");
  revalidatePath("/month");
  return { success: true };
}

export async function updateAnnualBudgets(
  year: number,
  budgets: { categoryId: string; budgetAmount: number }[]
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const rows = budgets.map((row) => ({
    user_id: user.id,
    year,
    category_id: row.categoryId,
    budget_amount: row.budgetAmount,
    currency: "USD" as Currency,
  }));

  const { error } = await supabase.from("annual_budgets").upsert(rows, {
    onConflict: "user_id,category_id,year",
  });

  if (error) return { error: error.message };

  revalidatePath("/target/annual");
  revalidatePath("/target");
  revalidatePath("/home");
  return { success: true };
}

export async function updateIncomeSource(
  id: string,
  data: { expected_monthly_amount?: number; active?: boolean; name?: string }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("income_sources")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/movements");
  revalidatePath("/target");
  return { success: true };
}

export async function createRule(data: {
  name: string;
  match_type: "contains" | "exact" | "starts_with";
  pattern: string;
  transaction_type: string;
  category_id?: string | null;
  excluded_from_spending?: boolean;
  is_recurring?: boolean;
  is_extraordinary?: boolean;
  priority?: number;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase.from("categorization_rules").insert({
    user_id: user.id,
    name: data.name,
    match_type: data.match_type,
    pattern: data.pattern.toUpperCase(),
    transaction_type: data.transaction_type as "expense",
    category_id: data.category_id ?? null,
    excluded_from_spending: data.excluded_from_spending ?? false,
    is_recurring: data.is_recurring ?? false,
    is_extraordinary: data.is_extraordinary ?? false,
    priority: data.priority ?? 100,
    active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function updateRule(
  id: string,
  data: {
    active?: boolean;
    priority?: number;
    pattern?: string;
    category_id?: string | null;
  }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("categorization_rules")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteRule(id: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("categorization_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
