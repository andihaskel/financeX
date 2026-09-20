import type {
  Commitment,
  CommitmentAmountType,
  CommitmentDirection,
  CommitmentRecurrenceType,
  Currency,
} from "@/types/database";

export type DefaultCommitmentSeed = {
  name: string;
  direction: CommitmentDirection;
  amount: number | null;
  currency: Currency;
  amount_type: CommitmentAmountType;
  recurrence_type: CommitmentRecurrenceType;
  due_day: number | null;
  due_month: number | null;
  match_hint: string | null;
  sort_order: number;
};

/** Starter checklist for new users — not hardcoded into the UI. */
export const DEFAULT_COMMITMENT_SEEDS: DefaultCommitmentSeed[] = [
  {
    name: "FONASA",
    direction: "pay",
    amount: 8358,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: 25,
    due_month: null,
    match_hint: "FONASA",
    sort_order: 10,
  },
  {
    name: "Apartment rent",
    direction: "pay",
    amount: 36000,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Rocío Velasco",
    sort_order: 20,
  },
  {
    name: "Common expenses",
    direction: "pay",
    amount: 7100,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: null,
    sort_order: 30,
  },
  {
    name: "Accountant",
    direction: "pay",
    amount: 1600,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Pereyra",
    sort_order: 40,
  },
  {
    name: "UTE",
    direction: "pay",
    amount: null,
    currency: "UYU",
    amount_type: "variable",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "UTE",
    sort_order: 50,
  },
  {
    name: "Antel",
    direction: "pay",
    amount: null,
    currency: "UYU",
    amount_type: "variable",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Antel",
    sort_order: 60,
  },
  {
    name: "Biguá",
    direction: "pay",
    amount: 3968,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "BIGUA",
    sort_order: 70,
  },
  {
    name: "American insurance",
    direction: "pay",
    amount: 8700,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: 30,
    due_month: null,
    match_hint: "American",
    sort_order: 80,
  },
  {
    name: "Psychologist",
    direction: "pay",
    amount: 5600,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: null,
    sort_order: 90,
  },
  {
    name: "Diano mortgage",
    direction: "receive",
    amount: 782,
    currency: "USD",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Diano",
    sort_order: 100,
  },
  {
    name: "Collerati mortgage",
    direction: "receive",
    amount: 508,
    currency: "USD",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Collerati",
    sort_order: 110,
  },
  {
    name: "Diano mortgage 2",
    direction: "receive",
    amount: 426,
    currency: "USD",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Diano",
    sort_order: 120,
  },
  {
    name: "Almeida mortgage",
    direction: "receive",
    amount: 195,
    currency: "USD",
    amount_type: "fixed",
    recurrence_type: "monthly",
    due_day: null,
    due_month: null,
    match_hint: "Almeida",
    sort_order: 130,
  },
  {
    name: "Car tax",
    direction: "pay",
    amount: 4200,
    currency: "UYU",
    amount_type: "fixed",
    recurrence_type: "annual",
    due_day: 1,
    due_month: 7,
    match_hint: null,
    sort_order: 200,
  },
];

export function isCommitmentActiveInMonth(
  commitment: Pick<
    Commitment,
    | "active"
    | "recurrence_type"
    | "due_month"
    | "custom_months"
    | "start_date"
    | "end_date"
  >,
  year: number,
  month: number
) {
  if (!commitment.active) return false;

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  if (commitment.start_date && commitment.start_date > periodEnd) return false;
  if (commitment.end_date && commitment.end_date < periodStart) return false;

  switch (commitment.recurrence_type) {
    case "monthly":
      return true;
    case "annual": {
      const dueMonth =
        commitment.due_month ??
        (commitment.start_date ? Number(commitment.start_date.slice(5, 7)) : null);
      return dueMonth === month;
    }
    case "one_time": {
      if (!commitment.start_date) return false;
      return (
        Number(commitment.start_date.slice(0, 4)) === year &&
        Number(commitment.start_date.slice(5, 7)) === month
      );
    }
    case "custom":
      return (commitment.custom_months ?? []).includes(month);
    default:
      return false;
  }
}

export function nextAnnualDueLabel(
  commitment: Pick<Commitment, "name" | "due_month" | "start_date" | "recurrence_type">,
  fromYear: number,
  fromMonth: number
) {
  if (commitment.recurrence_type !== "annual") return null;
  const dueMonth =
    commitment.due_month ??
    (commitment.start_date ? Number(commitment.start_date.slice(5, 7)) : null);
  if (!dueMonth) return null;

  let year = fromYear;
  if (dueMonth <= fromMonth) {
    year = fromYear + 1;
  }

  const monthName = new Date(year, dueMonth - 1, 1).toLocaleString("en-US", {
    month: "long",
  });
  return `Next due: ${monthName} ${year}`;
}
