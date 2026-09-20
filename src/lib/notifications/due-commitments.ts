import { displayAmountForOccurrence } from "@/lib/control/logic";
import { getZonedYmd, isDueOnCalendarDay } from "@/lib/control/due-today";
import {
  formatDueItemAmount,
  sendDueCommitmentsEmail,
  type DueCommitmentEmailItem,
} from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Commitment, CommitmentOccurrence, Currency } from "@/types/database";

type OccurrenceWithCommitment = CommitmentOccurrence & {
  commitments: Commitment | Commitment[] | null;
};

function unwrapCommitment(
  value: OccurrenceWithCommitment["commitments"]
): Commitment | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function runDueCommitmentsDigest(now: Date = new Date()) {
  const { year, month, day, dateLabel } = getZonedYmd("America/Montevideo", now);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("commitment_occurrences")
    .select(
      `
      id,
      user_id,
      status,
      expected_amount,
      actual_amount,
      commitments!inner (
        id,
        name,
        direction,
        amount,
        currency,
        amount_type,
        due_day,
        due_month,
        recurrence_type,
        active
      )
    `
    )
    .eq("year", year)
    .eq("month", month)
    .eq("status", "pending")
    .eq("commitments.active", true);

  if (error) {
    throw new Error(`Failed to load occurrences: ${error.message}`);
  }

  const dueByUser = new Map<string, DueCommitmentEmailItem[]>();

  for (const row of (data ?? []) as OccurrenceWithCommitment[]) {
    const commitment = unwrapCommitment(row.commitments);
    if (!commitment) continue;
    if (!isDueOnCalendarDay(commitment.due_day, year, month, day)) continue;

    if (
      commitment.recurrence_type === "annual" &&
      commitment.due_month != null &&
      commitment.due_month !== month
    ) {
      continue;
    }

    const amount = displayAmountForOccurrence(commitment, row);
    const item: DueCommitmentEmailItem = {
      name: commitment.name,
      direction: commitment.direction,
      amountLabel: formatDueItemAmount({
        amount,
        currency: commitment.currency as Currency,
        amountType: commitment.amount_type,
      }),
    };

    const list = dueByUser.get(row.user_id) ?? [];
    list.push(item);
    dueByUser.set(row.user_id, list);
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://www.andihaskel.space";
  const controlUrl = `${origin}/control`;

  const results: {
    userId: string;
    email: string | null;
    count: number;
    sent: boolean;
    error?: string;
  }[] = [];

  for (const [userId, items] of dueByUser) {
    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      results.push({
        userId,
        email: null,
        count: items.length,
        sent: false,
        error: userError?.message ?? "User has no email",
      });
      continue;
    }

    const send = await sendDueCommitmentsEmail({
      to: userData.user.email,
      dateLabel,
      items,
      controlUrl,
    });

    results.push({
      userId,
      email: userData.user.email,
      count: items.length,
      sent: send.ok,
      error: send.ok ? undefined : send.error,
    });
  }

  return {
    dateLabel,
    usersNotified: results.filter((r) => r.sent).length,
    dueUserCount: dueByUser.size,
    results,
  };
}
