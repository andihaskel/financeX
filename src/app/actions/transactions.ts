"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";

import { applyManualCategorization } from "@/lib/categorization/categorize";
import {
  generateTransactionFingerprint,
  normalizeDescription,
} from "@/lib/categorization/normalize";
import { getMonthDateRange } from "@/components/dashboard/month-nav";
import { createClient, getUser } from "@/lib/supabase/server";
import type { CategorizationStatus, Currency, TransactionType } from "@/types/database";

export async function updateTransaction(
  transactionId: string,
  data: {
    category_id?: string | null;
    transaction_type?: TransactionType;
    is_recurring?: boolean;
    is_extraordinary?: boolean;
    excluded_from_spending?: boolean;
    categorization_status?: CategorizationStatus;
    transaction_date?: string;
  }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  if (data.transaction_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.transaction_date)) {
    return { error: "Invalid date" };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select(
      "id, account_id, amount, normalized_description, transaction_date, category_id, transaction_type"
    )
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Movement not found" };

  const nextDate = data.transaction_date ?? existing.transaction_date;
  const patch: Record<string, unknown> = {
    categorization_status: data.categorization_status ?? "manual",
  };

  if (data.category_id !== undefined) patch.category_id = data.category_id;
  if (data.transaction_type !== undefined) patch.transaction_type = data.transaction_type;
  if (data.is_recurring !== undefined) patch.is_recurring = data.is_recurring;
  if (data.is_extraordinary !== undefined) patch.is_extraordinary = data.is_extraordinary;
  if (data.excluded_from_spending !== undefined) {
    patch.excluded_from_spending = data.excluded_from_spending;
  }
  if (data.transaction_date) {
    patch.transaction_date = data.transaction_date;
    patch.fingerprint = generateTransactionFingerprint({
      accountId: existing.account_id,
      transactionDate: nextDate,
      amount: existing.amount,
      normalizedDescription: existing.normalized_description,
    });
  }

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const monthKeys = new Set([
    existing.transaction_date.slice(0, 7),
    nextDate.slice(0, 7),
  ]);
  revalidatePath("/movements");
  revalidatePath("/home");
  revalidatePath("/review");
  for (const month of monthKeys) {
    revalidatePath(`/month/${month}`);
  }
  return { success: true };
}

export async function deleteTransaction(transactionId: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("id, transaction_date")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Movement not found" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const month = existing.transaction_date.slice(0, 7);
  revalidatePath("/movements");
  revalidatePath("/home");
  revalidatePath(`/month/${month}`);
  revalidatePath("/review");
  return { success: true };
}

export async function saveReviewTransaction(
  transactionId: string,
  data: {
    category_id: string | null;
    transaction_type: TransactionType;
    is_recurring: boolean;
    is_extraordinary: boolean;
    excluded_from_spending: boolean;
    rememberRule?: boolean;
    pattern?: string;
  }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  let ruleId: string | null = null;

  if (data.rememberRule && data.pattern) {
    const { data: rule, error: ruleError } = await supabase
      .from("categorization_rules")
      .insert({
        user_id: user.id,
        name: `Rule: ${data.pattern}`,
        match_type: "contains",
        pattern: data.pattern.toUpperCase(),
        transaction_type: data.transaction_type,
        category_id: data.category_id,
        excluded_from_spending: data.excluded_from_spending,
        is_recurring: data.is_recurring,
        is_extraordinary: data.is_extraordinary,
        priority: 100,
        active: true,
      })
      .select("id")
      .single();

    if (ruleError) return { error: ruleError.message };
    ruleId = rule.id;
  }

  const manualResult = applyManualCategorization({
    transaction_type: data.transaction_type,
    category_id: data.category_id,
    excluded_from_spending: data.excluded_from_spending,
    is_recurring: data.is_recurring,
    is_extraordinary: data.is_extraordinary,
    categorization_status: "manual",
    categorization_rule_id: ruleId,
  });

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: manualResult.category_id,
      transaction_type: manualResult.transaction_type,
      is_recurring: manualResult.is_recurring,
      is_extraordinary: manualResult.is_extraordinary,
      excluded_from_spending: manualResult.excluded_from_spending,
      categorization_status: manualResult.categorization_status,
      categorization_rule_id: manualResult.categorization_rule_id,
    })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/home");
  revalidatePath("/rules");
  return { success: true };
}

export async function bulkAssignReviewCategory(transactionIds: string[], categoryId: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  if (transactionIds.length === 0) return { success: true, updated: 0 };

  const supabase = await createClient();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, group")
    .eq("id", categoryId)
    .eq("user_id", user.id)
    .single();

  if (categoryError || !category) {
    return { error: "Category not found" };
  }

  const { data: transactions, error: fetchError } = await supabase
    .from("transactions")
    .select("id, transaction_type, is_recurring, excluded_from_spending")
    .in("id", transactionIds)
    .eq("user_id", user.id);

  if (fetchError) return { error: fetchError.message };
  if (!transactions?.length) return { error: "No transactions found" };

  const isExtraordinary = category.group === "extraordinary";

  for (const transaction of transactions) {
    const manualResult = applyManualCategorization({
      transaction_type: transaction.transaction_type,
      category_id: categoryId,
      excluded_from_spending: transaction.excluded_from_spending,
      is_recurring: transaction.is_recurring,
      is_extraordinary: isExtraordinary,
      categorization_status: "manual",
      categorization_rule_id: null,
    });

    const { error } = await supabase
      .from("transactions")
      .update({
        category_id: manualResult.category_id,
        transaction_type: manualResult.transaction_type,
        is_recurring: manualResult.is_recurring,
        is_extraordinary: manualResult.is_extraordinary,
        excluded_from_spending: manualResult.excluded_from_spending,
        categorization_status: manualResult.categorization_status,
        categorization_rule_id: manualResult.categorization_rule_id,
      })
      .eq("id", transaction.id)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  }

  revalidatePath("/review");
  revalidatePath("/movements");
  revalidatePath("/home");
  return { success: true, updated: transactions.length };
}

export async function bulkConfirmTransactions(transactionIds: string[]) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update({ categorization_status: "auto" })
    .in("id", transactionIds)
    .eq("user_id", user.id)
    .in("categorization_status", ["suggested", "needs_review"]);

  if (error) return { error: error.message };

  revalidatePath("/review");
  revalidatePath("/movements");
  return { success: true };
}

export async function deletePeriodTransactions(options: {
  month?: string;
  year?: string;
  accountId?: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  let start: string;
  let end: string;
  let monthKey: string | undefined;

  if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const range = getMonthDateRange(options.month);
    start = range.start;
    end = range.end;
    monthKey = options.month;
  } else if (options.year && /^\d{4}$/.test(options.year)) {
    start = `${options.year}-01-01`;
    end = `${options.year}-12-31`;
  } else {
    return { error: "Invalid period" };
  }

  const supabase = await createClient();

  if (options.accountId) {
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", options.accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accountError) return { error: accountError.message };
    if (!account) return { error: "Account not found" };
  }

  let fetchQuery = supabase
    .from("transactions")
    .select("id, import_id")
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  if (options.accountId) {
    fetchQuery = fetchQuery.eq("account_id", options.accountId);
  }

  const { data: periodTransactions, error: fetchError } = await fetchQuery;

  if (fetchError) return { error: fetchError.message };

  const toDelete = periodTransactions ?? [];
  if (toDelete.length === 0) {
    return { error: "No movements to delete for this selection" };
  }

  const importIds = [
    ...new Set(
      toDelete
        .map((tx) => tx.import_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ];

  let deleteQuery = supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  if (options.accountId) {
    deleteQuery = deleteQuery.eq("account_id", options.accountId);
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) return { error: deleteError.message };

  for (const importId of importIds) {
    const { count } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("import_id", importId);

    if (!count) {
      await supabase.from("imports").delete().eq("id", importId).eq("user_id", user.id);
    } else {
      await supabase
        .from("imports")
        .update({ transaction_count: count })
        .eq("id", importId)
        .eq("user_id", user.id);
    }
  }

  revalidatePath("/home");
  if (monthKey) {
    revalidatePath(`/month/${monthKey}`);
  }
  if (options.year) {
    revalidatePath("/home");
  }
  revalidatePath("/movements");
  revalidatePath("/target");
  revalidatePath("/review");

  return { success: true, deleted: toDelete.length };
}

export async function deleteMonthTransactions(month: string, accountId?: string) {
  return deletePeriodTransactions({ month, accountId });
}

function resolveManualTransactionDate(month: string) {
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  if (month === currentMonth) {
    return format(now, "yyyy-MM-dd");
  }
  const [, m] = month.split("-").map(Number);
  const year = Number(month.slice(0, 4));
  const lastDay = new Date(year, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}

export async function createManualTransaction(data: {
  month: string;
  description: string;
  amount: number;
  accountId: string;
  categoryId?: string | null;
  transactionType?: TransactionType;
  transactionDate?: string | null;
  currency?: Currency;
  isExtraordinary?: boolean;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  if (!/^\d{4}-\d{2}$/.test(data.month)) {
    return { error: "Invalid month" };
  }

  const description = data.description.trim();
  if (!description) return { error: "Description is required" };
  if (!data.accountId) return { error: "Select an account" };
  if (!Number.isFinite(data.amount) || data.amount === 0) {
    return { error: "Enter a valid amount" };
  }

  if (data.transactionDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.transactionDate)) {
    return { error: "Invalid date" };
  }

  if (data.currency && data.currency !== "USD" && data.currency !== "UYU") {
    return { error: "Invalid currency" };
  }

  const transactionType: TransactionType = data.transactionType ?? "expense";
  const needsCategory =
    transactionType === "expense" ||
    transactionType === "refund" ||
    transactionType === "income";
  if (needsCategory && !data.categoryId) {
    return { error: "Select a category" };
  }

  const supabase = await createClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("id", data.accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    return { error: "Account not found" };
  }

  let categoryGroup: string | null = null;
  if (data.categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, group")
      .eq("id", data.categoryId)
      .eq("user_id", user.id)
      .single();

    if (categoryError || !category) {
      return { error: "Category not found" };
    }
    categoryGroup = category.group;

    if (transactionType === "income" && category.group !== "income") {
      return { error: "Choose an income category" };
    }
    if (
      (transactionType === "expense" || transactionType === "refund") &&
      category.group === "income"
    ) {
      return { error: "Choose a spending category" };
    }
  }

  const absAmount = Math.abs(data.amount);
  const signedAmount =
    transactionType === "income" || transactionType === "refund"
      ? absAmount
      : -absAmount;

  const normalized = normalizeDescription(description);
  const transactionDate =
    data.transactionDate?.trim() || resolveManualTransactionDate(data.month);
  const currency = data.currency ?? account.currency;
  const fingerprint = generateTransactionFingerprint({
    accountId: data.accountId,
    transactionDate,
    amount: signedAmount,
    normalizedDescription: normalized,
  });

  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) {
    return { error: "This movement already exists" };
  }

  const excluded =
    transactionType === "transfer" || transactionType === "credit_card_payment";

  const manualResult = applyManualCategorization({
    transaction_type: transactionType,
    category_id: needsCategory ? (data.categoryId ?? null) : null,
    excluded_from_spending: excluded,
    is_recurring: false,
    is_extraordinary:
      data.isExtraordinary ?? categoryGroup === "extraordinary",
    categorization_status: "manual",
    categorization_rule_id: null,
  });

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: data.accountId,
    import_id: null,
    transaction_date: transactionDate,
    description,
    normalized_description: normalized,
    amount: signedAmount,
    currency,
    transaction_type: manualResult.transaction_type,
    category_id: manualResult.category_id,
    is_recurring: manualResult.is_recurring,
    is_extraordinary: manualResult.is_extraordinary,
    excluded_from_spending: manualResult.excluded_from_spending,
    categorization_status: manualResult.categorization_status,
    categorization_rule_id: manualResult.categorization_rule_id,
    notes: null,
    fingerprint,
  });

  if (error) return { error: error.message };

  const dateMonth = transactionDate.slice(0, 7);
  revalidatePath("/home");
  revalidatePath(`/month/${data.month}`);
  if (dateMonth !== data.month) {
    revalidatePath(`/month/${dateMonth}`);
  }
  revalidatePath("/movements");
  return { success: true, month: dateMonth, transactionDate };
}
