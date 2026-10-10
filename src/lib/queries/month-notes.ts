import { cache } from "react";

import { createClient, getUser } from "@/lib/supabase/server";

export const getMonthNoteBody = cache(async (month: string): Promise<string> => {
  if (!/^\d{4}-\d{2}$/.test(month)) return "";

  const user = await getUser();
  if (!user) return "";

  const supabase = await createClient();
  const { data } = await supabase
    .from("month_notes")
    .select("body")
    .eq("user_id", user.id)
    .eq("month", `${month}-01`)
    .maybeSingle();

  return data?.body ?? "";
});
