import { format, parseISO } from "date-fns";

import type {
  Commitment,
  CommitmentDirection,
  CommitmentOccurrence,
  Currency,
  Transaction,
} from "@/types/database";

export type DueUrgency = "none" | "normal" | "soon" | "overdue";

export type ControlRowStatusVisual = "pending" | "completed" | "reconciled";

export function formatControlAmount(
  amount: number | null | undefined,
  currency: Currency,
  amountType: "fixed" | "variable" = "fixed"
) {
  if (amountType === "variable" && (amount == null || Number.isNaN(amount))) {
    return "Variable";
  }
  const value = Math.abs(Math.round(Number(amount ?? 0))).toLocaleString("en-US");
  return currency === "UYU" ? `UYU ${value}` : `USD ${value}`;
}

export function getDueUrgency(
  dueDay: number | null,
  year: number,
  month: number,
  today: Date = new Date()
): { urgency: DueUrgency; label: string } {
  if (!dueDay) return { urgency: "none", label: "—" };

  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  const dueDate = new Date(year, month - 1, day);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((dueDate.getTime() - startOfToday.getTime()) / 86400000);
  const dateLabel = `${format(dueDate, "MMM")} ${day}`;

  if (diff < 0) return { urgency: "overdue", label: dateLabel };
  if (diff === 0) return { urgency: "soon", label: "Due today" };
  if (diff <= 5) return { urgency: "soon", label: `Due in ${diff}d` };

  return { urgency: "normal", label: dateLabel };
}

export function isOccurrenceDone(status: CommitmentOccurrence["status"]) {
  return status === "completed" || status === "reconciled";
}

export function visualStatusForRow(input: {
  status: CommitmentOccurrence["status"];
  dueUrgency?: DueUrgency;
}): ControlRowStatusVisual {
  if (input.status === "reconciled") return "reconciled";
  if (input.status === "completed") return "completed";
  return "pending";
}

export function displayAmountForOccurrence(
  commitment: Commitment,
  occurrence: Pick<CommitmentOccurrence, "expected_amount" | "actual_amount">
) {
  if (commitment.amount_type === "variable") {
    return occurrence.actual_amount ?? occurrence.expected_amount;
  }
  return occurrence.expected_amount ?? commitment.amount;
}

export type MatchCandidate = {
  transaction: Transaction;
  score: number;
  reasons: string[];
};

const AMOUNT_TOLERANCE = 1;

export function scoreCommitmentMatch(
  commitment: Commitment,
  occurrence: Pick<CommitmentOccurrence, "expected_amount" | "actual_amount">,
  transaction: Transaction,
  year: number,
  month: number
): MatchCandidate | null {
  if (transaction.currency !== commitment.currency) return null;

  const txMonth = transaction.transaction_date.slice(0, 7);
  const period = `${year}-${String(month).padStart(2, "0")}`;
  if (txMonth !== period) return null;

  const expected = displayAmountForOccurrence(commitment, occurrence);
  if (expected == null) return null;

  const absAmount = Math.abs(transaction.amount);
  if (Math.abs(absAmount - Number(expected)) > AMOUNT_TOLERANCE) return null;

  // Direction: pay = money leaving (negative or expense-like), receive = money in
  if (commitment.direction === "pay" && transaction.amount > 0) return null;
  if (commitment.direction === "receive" && transaction.amount < 0) return null;

  if (commitment.direction === "pay") {
    const allowed = new Set(["expense", "transfer", "credit_card_payment", "refund"]);
    if (!allowed.has(transaction.transaction_type) && transaction.amount >= 0) return null;
  }
  if (commitment.direction === "receive") {
    const allowed = new Set(["income", "transfer", "refund"]);
    if (!allowed.has(transaction.transaction_type) && transaction.amount <= 0) return null;
  }

  let score = 50;
  const reasons: string[] = ["amount", "currency", "month"];

  if (Math.abs(absAmount - Number(expected)) < 0.01) {
    score += 25;
    reasons.push("exact_amount");
  }

  const hint = (commitment.match_hint ?? "").trim().toLowerCase();
  const haystack = `${transaction.description} ${transaction.normalized_description}`.toLowerCase();
  if (hint && haystack.includes(hint.toLowerCase())) {
    score += 30;
    reasons.push("match_hint");
  }

  const nameTokens = commitment.name
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3);
  if (nameTokens.some((token) => haystack.includes(token))) {
    score += 15;
    reasons.push("name_token");
  }

  if (commitment.due_day) {
    const txDay = Number(transaction.transaction_date.slice(8, 10));
    if (Math.abs(txDay - commitment.due_day) <= 3) {
      score += 10;
      reasons.push("near_due_day");
    }
  }

  return { transaction, score, reasons };
}

export function findMatchCandidates(
  commitment: Commitment,
  occurrence: Pick<CommitmentOccurrence, "expected_amount" | "actual_amount">,
  transactions: Transaction[],
  year: number,
  month: number,
  usedTransactionIds: Set<string>
) {
  const candidates: MatchCandidate[] = [];
  for (const tx of transactions) {
    if (usedTransactionIds.has(tx.id)) continue;
    const match = scoreCommitmentMatch(commitment, occurrence, tx, year, month);
    if (match) candidates.push(match);
  }
  return candidates.sort((a, b) => b.score - a.score);
}

export function highConfidenceMatch(candidate: MatchCandidate | undefined) {
  return candidate && candidate.score >= 85 ? candidate : null;
}

export function possibleMatch(candidate: MatchCandidate | undefined) {
  return candidate && candidate.score >= 60 && candidate.score < 85 ? candidate : null;
}

export function summarizeRemaining(
  rows: {
    direction: CommitmentDirection;
    currency: Currency;
    amount: number | null;
    amountType: "fixed" | "variable";
    done: boolean;
  }[]
) {
  const pending = rows.filter((r) => !r.done);
  const payByCurrency = new Map<Currency, number>();
  const receiveByCurrency = new Map<Currency, number>();

  for (const row of pending) {
    if (row.amountType === "variable" || row.amount == null) continue;
    const map = row.direction === "pay" ? payByCurrency : receiveByCurrency;
    map.set(row.currency, (map.get(row.currency) ?? 0) + row.amount);
  }

  return {
    pendingCount: pending.length,
    payByCurrency,
    receiveByCurrency,
  };
}

export function formatPeriodAmounts(map: Map<Currency, number>, verb: "pay" | "receive") {
  const parts: string[] = [];
  for (const currency of ["UYU", "USD"] as Currency[]) {
    const amount = map.get(currency);
    if (!amount) continue;
    parts.push(
      `${formatControlAmount(amount, currency, "fixed")} to ${verb}`
    );
  }
  return parts.join(" · ");
}

export function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function monthKeyFromParts(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatShortTxDate(date: string) {
  return format(parseISO(date), "MMM d");
}
