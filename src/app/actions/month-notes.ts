"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

export async function upsertMonthNote(month: string, body: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Invalid month" };

  const supabase = await createClient();
  const monthDate = `${month}-01`;
  const trimmed = body.trimEnd();

  if (!trimmed.trim()) {
    const { error } = await supabase
      .from("month_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("month", monthDate);

    if (error) return { error: error.message };
    revalidatePath(`/month/${month}`);
    return { success: true, body: "" };
  }

  const { error } = await supabase.from("month_notes").upsert(
    {
      user_id: user.id,
      month: monthDate,
      body: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/month/${month}`);
  return { success: true, body: trimmed };
}
