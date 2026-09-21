"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";
import type { Currency, WealthPositionKind } from "@/types/database";

function revalidateWealthPaths() {
  revalidatePath("/wealth");
  revalidatePath("/target", "layout");
}

export async function createWealthPosition(data: {
  name: string;
  kind: WealthPositionKind;
  amount: number;
  currency: Currency;
  accountId?: string | null;
  notes?: string | null;
}) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const name = data.name.trim();
  if (!name) return { error: "Name is required" };
  if (!Number.isFinite(data.amount) || data.amount < 0) {
    return { error: "Amount must be zero or greater" };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("wealth_positions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { error } = await supabase.from("wealth_positions").insert({
    user_id: user.id,
    name,
    kind: data.kind,
    amount: data.amount,
    currency: data.currency,
    account_id: data.accountId || null,
    notes: data.notes?.trim() || null,
    sort_order: count ?? 0,
    active: true,
  });

  if (error) return { error: error.message };

  revalidateWealthPaths();
  return { success: true };
}

export async function updateWealthPosition(
  id: string,
  data: {
    name?: string;
    kind?: WealthPositionKind;
    amount?: number;
    currency?: Currency;
    accountId?: string | null;
    notes?: string | null;
    active?: boolean;
  }
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (!name) return { error: "Name is required" };
    patch.name = name;
  }
  if (data.kind !== undefined) patch.kind = data.kind;
  if (data.amount !== undefined) {
    if (!Number.isFinite(data.amount) || data.amount < 0) {
      return { error: "Amount must be zero or greater" };
    }
    patch.amount = data.amount;
  }
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.accountId !== undefined) patch.account_id = data.accountId || null;
  if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
  if (data.active !== undefined) patch.active = data.active;

  const supabase = await createClient();
  const { error } = await supabase
    .from("wealth_positions")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidateWealthPaths();
  return { success: true };
}

export async function deleteWealthPosition(id: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("wealth_positions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidateWealthPaths();
  return { success: true };
}
