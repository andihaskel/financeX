import { format } from "date-fns";
import { cache } from "react";

import { createClient, getUser } from "@/lib/supabase/server";

export function getPrimaryMonthFromDates(dates: string[]): string | null {
  if (dates.length === 0) return null;

  const counts = new Map<string, number>();
  for (const date of dates) {
    const month = date.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export const getLatestTransactionMonth = cache(async (): Promise<string | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("transaction_date")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.transaction_date?.slice(0, 7) ?? null;
});

export const hasAnyTransactions = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;

  const supabase = await createClient();
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (count ?? 0) > 0;
});

/** Default to latest month with data when no month is selected in the URL. */
export async function resolveViewMonth(requestedMonth?: string): Promise<string> {
  if (requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)) {
    return requestedMonth;
  }

  const latest = await getLatestTransactionMonth();
  if (latest) return latest;

  return format(new Date(), "yyyy-MM");
}
