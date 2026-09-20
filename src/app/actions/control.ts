"use server";

import { revalidatePath } from "next/cache";

import { isCommitmentActiveInMonth } from "@/lib/control/defaults";
import {
  findMatchCandidates,
  highConfidenceMatch,
  possibleMatch,
} from "@/lib/control/logic";
import { getControlMonthBundle, findPreviousMonthWithOccurrences } from "@/lib/queries/control";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  CommitmentAmountType,
  CommitmentDirection,
  CommitmentRecurrenceType,
  Currency,
} from "@/types/database";

function revalidateControl(monthKey?: string) {
  revalidatePath("/control");
  if (monthKey) revalidatePath(`/control?month=${monthKey}`);
}

export async function createCommitment(input: {
  name: string;
  direction: CommitmentDirection;
  amount: number | null;
  currency: Currency;
  amount_type: CommitmentAmountType;
  recurrence_type: CommitmentRecurrenceType;
  due_day: number | null;
  due_month: number | null;
  match_hint: string | null;
  monthKey: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  if (input.amount_type === "fixed" && (input.amount == null || input.amount < 0)) {
    return { error: "Amount is required for fixed commitments" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      user_id: user.id,
      name,
      direction: input.direction,
      amount: input.amount_type === "variable" ? null : input.amount,
      currency: input.currency,
      amount_type: input.amount_type,
      recurrence_type: input.recurrence_type,
      due_day: input.due_day,
      due_month: input.due_month,
      match_hint: input.match_hint?.trim() || null,
      active: true,
      sort_order: 500,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const [year, month] = input.monthKey.split("-").map(Number);
  const created: Parameters<typeof isCommitmentActiveInMonth>[0] = {
    active: true,
    recurrence_type: input.recurrence_type,
    due_month: input.due_month,
    custom_months: null,
    start_date: input.recurrence_type === "one_time" ? `${input.monthKey}-01` : null,
    end_date: null,
  };

  if (isCommitmentActiveInMonth(created, year, month)) {
    await supabase.from("commitment_occurrences").upsert(
      {
        user_id: user.id,
        commitment_id: data.id,
        year,
        month,
        expected_amount: input.amount_type === "fixed" ? input.amount : null,
        status: "pending",
      },
      { onConflict: "commitment_id,year,month" }
    );
  }

  // Persist one_time start_date
  if (input.recurrence_type === "one_time") {
    await supabase
      .from("commitments")
      .update({ start_date: `${input.monthKey}-01` })
      .eq("id", data.id)
      .eq("user_id", user.id);
  }

  revalidateControl(input.monthKey);
  return { success: true };
}

export async function updateCommitment(input: {
  id: string;
  name: string;
  direction: CommitmentDirection;
  amount: number | null;
  currency: Currency;
  amount_type: CommitmentAmountType;
  recurrence_type: CommitmentRecurrenceType;
  due_day: number | null;
  due_month: number | null;
  match_hint: string | null;
  monthKey: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Name is required" };
  if (input.amount_type === "fixed" && (input.amount == null || input.amount < 0)) {
    return { error: "Amount is required for fixed commitments" };
  }

  const supabase = await createClient();
  const amount = input.amount_type === "variable" ? null : input.amount;

  const { error } = await supabase
    .from("commitments")
    .update({
      name,
      direction: input.direction,
      amount,
      currency: input.currency,
      amount_type: input.amount_type,
      recurrence_type: input.recurrence_type,
      due_day: input.due_day,
      due_month: input.due_month,
      match_hint: input.match_hint?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  const [year, month] = input.monthKey.split("-").map(Number);
  await supabase
    .from("commitment_occurrences")
    .update({
      expected_amount: input.amount_type === "fixed" ? amount : null,
      updated_at: new Date().toISOString(),
    })
    .eq("commitment_id", input.id)
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("month", month);

  revalidateControl(input.monthKey);
  return { success: true };
}

/** Remove this commitment from the current month checklist only (template stays). */
export async function removeCommitmentFromMonth(
  occurrenceId: string,
  monthKey: string
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("commitment_occurrences")
    .delete()
    .eq("id", occurrenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidateControl(monthKey);
  return { success: true };
}

/** Permanently delete the commitment template (all months). */
export async function deleteCommitment(id: string, monthKey: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("commitments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidateControl(monthKey);
  return { success: true };
}

/** Create pending occurrences for this month from the previous month's list (unchecked). */
export async function copyCommitmentsFromPreviousMonth(monthKey: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const [year, month] = monthKey.split("-").map(Number);
  const supabase = await createClient();

  const { count: existingCount } = await supabase
    .from("commitment_occurrences")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("month", month);

  if ((existingCount ?? 0) > 0) {
    return { error: "This month already has commitments" };
  }

  const previous = await findPreviousMonthWithOccurrences(user.id, year, month);

  const { data: commitments } = await supabase
    .from("commitments")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true);

  const list = (commitments ?? []) as import("@/types/database").Commitment[];
  const byId = new Map(list.map((c) => [c.id, c]));

  let sourceCommitmentIds: string[] = [];
  let sourceLabel = "";

  if (previous) {
    const { data: prevOccurrences } = await supabase
      .from("commitment_occurrences")
      .select("commitment_id")
      .eq("user_id", user.id)
      .eq("year", previous.year)
      .eq("month", previous.month);

    sourceCommitmentIds = [
      ...new Set((prevOccurrences ?? []).map((o) => o.commitment_id as string)),
    ];
    sourceLabel = `${previous.year}-${String(previous.month).padStart(2, "0")}`;
  } else {
    // First month: set up from active templates applicable to this month
    sourceCommitmentIds = list
      .filter((c) => isCommitmentActiveInMonth(c, year, month))
      .map((c) => c.id);
    sourceLabel = "commitments";
  }

  const toInsert = sourceCommitmentIds
    .map((id) => byId.get(id))
    .filter((c): c is import("@/types/database").Commitment => Boolean(c))
    .filter((c) => isCommitmentActiveInMonth(c, year, month))
    .map((c) => ({
      user_id: user.id,
      commitment_id: c.id,
      year,
      month,
      expected_amount: c.amount_type === "fixed" ? c.amount : null,
      actual_amount: null,
      status: "pending" as const,
    }));

  if (toInsert.length === 0) {
    return { error: "Nothing to copy for this month" };
  }

  const { error } = await supabase.from("commitment_occurrences").insert(toInsert);
  if (error) return { error: error.message };

  revalidateControl(monthKey);
  return { success: true, count: toInsert.length, sourceLabel };
}

export async function toggleCommitmentOccurrence(occurrenceId: string, monthKey: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("commitment_occurrences")
    .select("*")
    .eq("id", occurrenceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!existing) return { error: "Occurrence not found" };

  const done = existing.status === "completed" || existing.status === "reconciled";
  const patch = done
    ? {
        status: "pending" as const,
        manually_completed_at: null,
        reconciled_transaction_id: null,
        reconciled_at: null,
        updated_at: new Date().toISOString(),
      }
    : {
        status: "completed" as const,
        manually_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const { error } = await supabase
    .from("commitment_occurrences")
    .update(patch)
    .eq("id", occurrenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateControl(monthKey);
  return { success: true, status: patch.status };
}

export async function updateOccurrenceAmount(
  occurrenceId: string,
  amount: number,
  monthKey: string
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  if (!Number.isFinite(amount) || amount < 0) return { error: "Invalid amount" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("commitment_occurrences")
    .update({
      actual_amount: amount,
      expected_amount: amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", occurrenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateControl(monthKey);
  return { success: true };
}

export async function confirmOccurrenceMatch(input: {
  occurrenceId: string;
  transactionId: string;
  monthKey: string;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("id", input.transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txError) return { error: txError.message };
  if (!tx) return { error: "Movement not found" };

  const { error } = await supabase
    .from("commitment_occurrences")
    .update({
      status: "reconciled",
      manually_completed_at: new Date().toISOString(),
      reconciled_transaction_id: input.transactionId,
      reconciled_at: new Date().toISOString(),
      actual_amount: Math.abs(Number(tx.amount)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.occurrenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateControl(input.monthKey);
  return { success: true };
}

export async function clearOccurrenceMatch(occurrenceId: string, monthKey: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("commitment_occurrences")
    .update({
      status: "completed",
      reconciled_transaction_id: null,
      reconciled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", occurrenceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateControl(monthKey);
  return { success: true };
}

export type ReconcileSuggestion = {
  occurrenceId: string;
  commitmentName: string;
  direction: CommitmentDirection;
  amountLabel: string;
  auto: boolean;
  transactionId: string;
  transactionLabel: string;
  score: number;
};

export async function reconcileMonth(monthKey: string) {
  const bundle = await getControlMonthBundle(monthKey);
  if (!bundle) return { error: "Not authenticated" };

  const commitmentById = new Map(bundle.commitments.map((c) => [c.id, c]));
  const used = new Set(
    bundle.occurrences
      .map((o) => o.reconciled_transaction_id)
      .filter((id): id is string => Boolean(id))
  );

  const autoLinked: string[] = [];
  const suggestions: ReconcileSuggestion[] = [];

  const supabase = await createClient();

  // Prefer pending/completed (not yet reconciled) rows that are completed or pending with strong match
  for (const occurrence of bundle.occurrences) {
    if (occurrence.status === "reconciled" || occurrence.status === "skipped") continue;
    const commitment = commitmentById.get(occurrence.commitment_id);
    if (!commitment) continue;

    const candidates = findMatchCandidates(
      commitment,
      occurrence,
      bundle.transactions,
      bundle.year,
      bundle.month,
      used
    );
    const best = candidates[0];
    const auto = highConfidenceMatch(best);
    const possible = possibleMatch(best);

    if (auto) {
      used.add(auto.transaction.id);
      const { error } = await supabase
        .from("commitment_occurrences")
        .update({
          status: "reconciled",
          manually_completed_at:
            occurrence.manually_completed_at ?? new Date().toISOString(),
          reconciled_transaction_id: auto.transaction.id,
          reconciled_at: new Date().toISOString(),
          actual_amount:
            occurrence.actual_amount ?? Math.abs(auto.transaction.amount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", occurrence.id)
        .eq("user_id", bundle.userId);
      if (!error) autoLinked.push(commitment.name);
      continue;
    }

    if (possible && (occurrence.status === "completed" || occurrence.status === "pending")) {
      used.add(possible.transaction.id);
      suggestions.push({
        occurrenceId: occurrence.id,
        commitmentName: commitment.name,
        direction: commitment.direction,
        amountLabel: `${commitment.currency} ${Math.round(
          Number(
            occurrence.actual_amount ??
              occurrence.expected_amount ??
              commitment.amount ??
              0
          )
        ).toLocaleString("en-US")}`,
        auto: false,
        transactionId: possible.transaction.id,
        transactionLabel: `${possible.transaction.transaction_date} · ${possible.transaction.description}`,
        score: possible.score,
      });
    }
  }

  revalidateControl(monthKey);
  return {
    success: true,
    autoLinked,
    suggestions,
  };
}
