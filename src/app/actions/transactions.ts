"use server";

import { revalidatePath } from "next/cache";
import { endOfMonth, format, parseISO, subMonths } from "date-fns";

import { applyManualCategorization } from "@/lib/categorization/categorize";
import {
  generateTransactionFingerprint,
  normalizeDescription,
} from "@/lib/categorization/normalize";
import { getMonthDateRange } from "@/components/dashboard/month-nav";
import {
  applyIncomeWealthPositionAdjustments,
  buildIncomeWealthPositionAdjustments,
  resolveIncomeWealthLink,
} from "@/lib/accounting/income-wealth";
import { getUserSettings } from "@/lib/queries/finance";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  CategorizationStatus,
  Currency,
  TransactionType,
  TransferDestinationKind,
} from "@/types/database";

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
    refunds_transaction_id?: string | null;
    transfer_destination_kind?: TransferDestinationKind | null;
    transfer_destination_account_id?: string | null;
    transfer_destination_wealth_position_id?: string | null;
    income_wealth_position_id?: string | null;
    income_principal_amount?: number | null;
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
      "id, account_id, amount, currency, normalized_description, transaction_date, category_id, transaction_type, refunds_transaction_id, income_wealth_position_id, income_principal_amount"
    )
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Movement not found" };

  const nextDate = data.transaction_date ?? existing.transaction_date;
  const nextType = data.transaction_type ?? existing.transaction_type;
  const patch: Record<string, unknown> = {
    categorization_status: data.categorization_status ?? "manual",
  };
  const monthKeys = new Set([
    existing.transaction_date.slice(0, 7),
    nextDate.slice(0, 7),
  ]);

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

  if (nextType !== "refund") {
    patch.refunds_transaction_id = null;
  } else if (data.refunds_transaction_id !== undefined) {
    if (!data.refunds_transaction_id) {
      patch.refunds_transaction_id = null;
    } else {
      if (data.refunds_transaction_id === transactionId) {
        return { error: "A refund cannot link to itself" };
      }

      const { data: expense, error: expenseError } = await supabase
        .from("transactions")
        .select("id, transaction_type, transaction_date, amount")
        .eq("id", data.refunds_transaction_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (expenseError) return { error: expenseError.message };
      if (!expense || expense.transaction_type !== "expense" || expense.amount >= 0) {
        return { error: "Choose a valid expense to link" };
      }

      patch.refunds_transaction_id = data.refunds_transaction_id;
      monthKeys.add(expense.transaction_date.slice(0, 7));
    }
  }

  if (existing.refunds_transaction_id) {
    const { data: previousExpense } = await supabase
      .from("transactions")
      .select("transaction_date")
      .eq("id", existing.refunds_transaction_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (previousExpense?.transaction_date) {
      monthKeys.add(previousExpense.transaction_date.slice(0, 7));
    }
  }

  if (nextType !== "transfer") {
    patch.transfer_destination_kind = null;
    patch.transfer_destination_account_id = null;
    patch.transfer_destination_wealth_position_id = null;
  } else if (
    data.transfer_destination_kind !== undefined ||
    data.transfer_destination_account_id !== undefined ||
    data.transfer_destination_wealth_position_id !== undefined
  ) {
    const kind = data.transfer_destination_kind ?? null;

    if (!kind) {
      patch.transfer_destination_kind = null;
      patch.transfer_destination_account_id = null;
      patch.transfer_destination_wealth_position_id = null;
    } else if (kind === "internal_account") {
      const accountId = data.transfer_destination_account_id ?? null;
      if (!accountId) {
        return { error: "Choose the destination account" };
      }
      if (accountId === existing.account_id) {
        return { error: "Destination account must be different from the source account" };
      }

      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (accountError) return { error: accountError.message };
      if (!account) return { error: "Choose a valid destination account" };

      patch.transfer_destination_kind = kind;
      patch.transfer_destination_account_id = accountId;
      patch.transfer_destination_wealth_position_id = null;
    } else if (kind === "wealth_position") {
      const positionId = data.transfer_destination_wealth_position_id ?? null;
      if (!positionId) {
        return { error: "Choose the destination wealth position" };
      }

      const { data: position, error: positionError } = await supabase
        .from("wealth_positions")
        .select("id")
        .eq("id", positionId)
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();

      if (positionError) return { error: positionError.message };
      if (!position) return { error: "Choose a valid wealth position" };

      patch.transfer_destination_kind = kind;
      patch.transfer_destination_account_id = null;
      patch.transfer_destination_wealth_position_id = positionId;
    } else if (kind === "external") {
      patch.transfer_destination_kind = kind;
      patch.transfer_destination_account_id = null;
      patch.transfer_destination_wealth_position_id = null;
    }
  }

  const shouldProcessIncomeWealth =
    nextType !== "income" ||
    data.income_wealth_position_id !== undefined ||
    data.income_principal_amount !== undefined;

  if (shouldProcessIncomeWealth) {
    const existingPositionId = existing.income_wealth_position_id ?? null;
    const existingPrincipal =
      existing.income_principal_amount != null
        ? Number(existing.income_principal_amount)
        : 0;

    const resolved = resolveIncomeWealthLink({
      nextType,
      amount: Number(existing.amount),
      positionId:
        nextType === "income" && data.income_wealth_position_id === undefined
          ? existingPositionId
          : data.income_wealth_position_id,
      principalAmount:
        nextType === "income" && data.income_principal_amount === undefined
          ? existing.income_principal_amount
          : data.income_principal_amount,
      existing: {
        income_wealth_position_id: existingPositionId,
        income_principal_amount: existingPrincipal > 0 ? existingPrincipal : null,
      },
    });

    if ("error" in resolved) return { error: resolved.error };

    const nextPositionId = resolved.link.income_wealth_position_id;
    const nextPrincipal = resolved.link.income_principal_amount ?? 0;
    const positionIds = [existingPositionId, nextPositionId].filter(
      (value): value is string => Boolean(value)
    );

    if (
      existingPrincipal !== nextPrincipal ||
      existingPositionId !== nextPositionId
    ) {
      if (nextPositionId) {
        const { data: nextPosition, error: nextPositionError } = await supabase
          .from("wealth_positions")
          .select("id")
          .eq("id", nextPositionId)
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle();

        if (nextPositionError) return { error: nextPositionError.message };
        if (!nextPosition) return { error: "Choose a valid wealth position" };
      }

      const uniquePositionIds = [...new Set(positionIds)];
      const positions = new Map<string, { amount: number; currency: "USD" | "UYU" }>();

      if (uniquePositionIds.length > 0) {
        const { data: positionRows, error: positionsError } = await supabase
          .from("wealth_positions")
          .select("id, amount, currency")
          .in("id", uniquePositionIds)
          .eq("user_id", user.id)
          .eq("active", true);

        if (positionsError) return { error: positionsError.message };

        for (const row of positionRows ?? []) {
          positions.set(row.id, {
            amount: Number(row.amount),
            currency: row.currency,
          });
        }

        for (const positionId of uniquePositionIds) {
          if (!positions.has(positionId)) {
            return { error: "Wealth position not found" };
          }
        }
      }

      const settings = await getUserSettings();
      const uyuRate = settings?.uyu_to_usd_rate ?? 40;
      const built = buildIncomeWealthPositionAdjustments({
        existingPositionId,
        existingPrincipal,
        existingTxCurrency: existing.currency,
        nextPositionId,
        nextPrincipal,
        nextTxCurrency: existing.currency,
        positions,
        uyuRate,
      });

      if ("error" in built) return { error: built.error };

      const adjustResult = await applyIncomeWealthPositionAdjustments(
        supabase,
        user.id,
        built.adjustments
      );
      if (adjustResult.error) return { error: adjustResult.error };
    }

    patch.income_wealth_position_id = resolved.link.income_wealth_position_id;
    patch.income_principal_amount = resolved.link.income_principal_amount;
  }

  const { error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/movements");
  revalidatePath("/home");
  revalidatePath("/wealth");
  revalidatePath("/review");
  revalidatePath("/target", "layout");
  for (const month of monthKeys) {
    revalidatePath(`/month/${month}`);
  }
  return { success: true };
}

export type RefundLinkExpense = {
  id: string;
  description: string;
  transaction_date: string;
  amount: number;
  currency: "USD" | "UYU";
};

export async function searchExpensesForRefundLink(options: {
  refundId?: string;
  accountId?: string;
  accountIds?: string[];
  query?: string;
  linkedExpenseId?: string | null;
  limit?: number;
  month?: string;
  date?: string;
  categoryId?: string;
}) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" as const, expenses: [] as RefundLinkExpense[], truncated: false };
  }

  const supabase = await createClient();
  const needle = options.query?.trim() ?? "";
  const hasScopedFilters = Boolean(options.date || options.month || needle || options.categoryId);
  const limit = Math.min(options.limit ?? (hasScopedFilters ? 50 : 40), 100);

  let request = supabase
    .from("transactions")
    .select("id, description, transaction_date, amount, currency, account_id")
    .eq("user_id", user.id)
    .eq("transaction_type", "expense")
    .lt("amount", 0)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (options.date) {
    request = request.eq("transaction_date", options.date);
  } else if (options.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const monthStart = `${options.month}-01`;
    const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");
    request = request.gte("transaction_date", monthStart).lte("transaction_date", monthEnd);
  } else if (!needle) {
    request = request.gte(
      "transaction_date",
      format(subMonths(new Date(), 12), "yyyy-MM-dd")
    );
  }

  if (needle) {
    request = request.ilike("description", `%${needle}%`);
  }

  if (options.categoryId) {
    request = request.eq("category_id", options.categoryId);
  }

  if (options.accountIds?.length) {
    request = request.in("account_id", options.accountIds);
  } else if (options.accountId) {
    request = request.eq("account_id", options.accountId);
  }

  const { data, error } = await request;
  if (error) return { error: error.message, expenses: [] as RefundLinkExpense[], truncated: false };

  const expenses = (data ?? []).filter((row) => row.id !== options.refundId) as RefundLinkExpense[];
  const truncated = (data?.length ?? 0) >= limit;

  if (
    options.linkedExpenseId &&
    !expenses.some((row) => row.id === options.linkedExpenseId)
  ) {
    const { data: linked } = await supabase
      .from("transactions")
      .select("id, description, transaction_date, amount, currency")
      .eq("id", options.linkedExpenseId)
      .eq("user_id", user.id)
      .eq("transaction_type", "expense")
      .lt("amount", 0)
      .maybeSingle();

    if (linked) {
      expenses.unshift(linked as RefundLinkExpense);
    }
  }

  return { expenses, truncated };
}

export async function deleteTransaction(transactionId: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select(
      "id, transaction_date, transaction_type, currency, income_wealth_position_id, income_principal_amount"
    )
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Movement not found" };

  if (existing.income_wealth_position_id && existing.income_principal_amount) {
    const settings = await getUserSettings();
    const uyuRate = settings?.uyu_to_usd_rate ?? 40;
    const { data: position, error: positionError } = await supabase
      .from("wealth_positions")
      .select("id, amount, currency")
      .eq("id", existing.income_wealth_position_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (positionError) return { error: positionError.message };

    if (position) {
      const positions = new Map([
        [
          position.id,
          { amount: Number(position.amount), currency: position.currency },
        ],
      ]);
      const built = buildIncomeWealthPositionAdjustments({
        existingPositionId: existing.income_wealth_position_id,
        existingPrincipal: Number(existing.income_principal_amount),
        existingTxCurrency: existing.currency,
        nextPositionId: null,
        nextPrincipal: 0,
        nextTxCurrency: existing.currency,
        positions,
        uyuRate,
      });

      if ("error" in built) return { error: built.error };

      const adjustResult = await applyIncomeWealthPositionAdjustments(
        supabase,
        user.id,
        built.adjustments
      );
      if (adjustResult.error) return { error: adjustResult.error };
    }
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const month = existing.transaction_date.slice(0, 7);
  revalidatePath("/movements");
  revalidatePath("/home");
  revalidatePath("/wealth");
  revalidatePath(`/month/${month}`);
  revalidatePath("/review");
  revalidatePath("/target", "layout");
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
    refunds_transaction_id: null,
    transfer_destination_kind: null,
    transfer_destination_account_id: null,
    transfer_destination_wealth_position_id: null,
    income_wealth_position_id: null,
    income_principal_amount: null,
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
