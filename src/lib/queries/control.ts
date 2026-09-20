import { DEFAULT_COMMITMENT_SEEDS, isCommitmentActiveInMonth } from "@/lib/control/defaults";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Commitment,
  CommitmentOccurrence,
  Transaction,
} from "@/types/database";

export async function ensureDefaultCommitments(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("commitments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) > 0) return;

  const rows = DEFAULT_COMMITMENT_SEEDS.map((seed) => ({
    user_id: userId,
    name: seed.name,
    direction: seed.direction,
    amount: seed.amount,
    currency: seed.currency,
    amount_type: seed.amount_type,
    recurrence_type: seed.recurrence_type,
    due_day: seed.due_day,
    due_month: seed.due_month,
    match_hint: seed.match_hint,
    sort_order: seed.sort_order,
    active: true,
  }));

  const { error } = await supabase.from("commitments").insert(rows);
  if (error) console.error("seed commitments failed", error);
}

/** Read-only: never auto-creates month occurrences. */
export async function getOccurrencesForMonth(userId: string, year: number, month: number) {
  const supabase = await createClient();
  const [{ data: commitments }, { data: occurrences }] = await Promise.all([
    supabase
      .from("commitments")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("commitment_occurrences")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("month", month),
  ]);

  return {
    commitments: (commitments ?? []) as Commitment[],
    occurrences: (occurrences ?? []) as CommitmentOccurrence[],
  };
}

export async function findPreviousMonthWithOccurrences(
  userId: string,
  year: number,
  month: number
) {
  const supabase = await createClient();
  let y = year;
  let m = month;

  for (let i = 0; i < 24; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }

    const { count } = await supabase
      .from("commitment_occurrences")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("year", y)
      .eq("month", m);

    if ((count ?? 0) > 0) {
      return { year: y, month: m };
    }
  }

  return null;
}

export async function getControlMonthBundle(monthKey: string) {
  const user = await getUser();
  if (!user) return null;

  await ensureDefaultCommitments(user.id);

  const [year, month] = monthKey.split("-").map(Number);
  const { commitments, occurrences } = await getOccurrencesForMonth(user.id, year, month);

  const supabase = await createClient();
  const start = `${monthKey}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: transactions }, previousMonth] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end),
    occurrences.length === 0
      ? findPreviousMonthWithOccurrences(user.id, year, month)
      : Promise.resolve(null),
  ]);

  return {
    userId: user.id,
    year,
    month,
    monthKey,
    commitments,
    occurrences,
    transactions: (transactions ?? []) as Transaction[],
    previousMonthWithOccurrences: previousMonth,
    hasApplicableCommitments: commitments.some((c) =>
      isCommitmentActiveInMonth(c, year, month)
    ),
  };
}
