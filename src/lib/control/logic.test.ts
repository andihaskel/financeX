import { describe, expect, it } from "vitest";

import { isCommitmentActiveInMonth, nextAnnualDueLabel } from "@/lib/control/defaults";
import {
  getDueUrgency,
  scoreCommitmentMatch,
  visualStatusForRow,
} from "@/lib/control/logic";
import type { Commitment, Transaction } from "@/types/database";

const baseCommitment = {
  id: "1",
  user_id: "u",
  name: "Apartment rent",
  direction: "pay" as const,
  amount: 36000,
  currency: "UYU" as const,
  amount_type: "fixed" as const,
  recurrence_type: "monthly" as const,
  due_day: null,
  due_month: null,
  custom_months: null,
  start_date: null,
  end_date: null,
  match_hint: "Rocío",
  active: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
} satisfies Commitment;

describe("control recurrence", () => {
  it("includes monthly commitments every month", () => {
    expect(isCommitmentActiveInMonth(baseCommitment, 2026, 9)).toBe(true);
  });

  it("includes annual only in due month", () => {
    const carTax = {
      ...baseCommitment,
      name: "Car tax",
      recurrence_type: "annual" as const,
      due_month: 7,
    };
    expect(isCommitmentActiveInMonth(carTax, 2026, 7)).toBe(true);
    expect(isCommitmentActiveInMonth(carTax, 2026, 9)).toBe(false);
    expect(nextAnnualDueLabel(carTax, 2026, 9)).toContain("July 2027");
  });
});

describe("control due urgency", () => {
  it("marks overdue and soon", () => {
    const today = new Date(2026, 8, 20);
    expect(getDueUrgency(10, 2026, 9, today).urgency).toBe("overdue");
    expect(getDueUrgency(22, 2026, 9, today).urgency).toBe("soon");
    expect(getDueUrgency(30, 2026, 9, today).urgency).toBe("normal");
  });
});

describe("control matching", () => {
  it("scores high when amount, month and hint match", () => {
    const tx = {
      id: "t1",
      user_id: "u",
      account_id: "a",
      import_id: null,
      transaction_date: "2026-09-04",
      description: "Transfer Rocío Velasco",
      normalized_description: "transfer rocio velasco",
      amount: -36000,
      currency: "UYU" as const,
      transaction_type: "expense" as const,
      category_id: null,
      is_recurring: false,
      is_extraordinary: false,
      excluded_from_spending: false,
      categorization_status: "manual" as const,
      categorization_rule_id: null,
      notes: null,
      fingerprint: "x",
      refunds_transaction_id: null,
      transfer_destination_kind: null,
      transfer_destination_account_id: null,
      transfer_destination_wealth_position_id: null,
      income_wealth_position_id: null,
      income_principal_amount: null,
      created_at: "",
      updated_at: "",
    } satisfies Transaction;

    const match = scoreCommitmentMatch(
      baseCommitment,
      { expected_amount: 36000, actual_amount: null },
      tx,
      2026,
      9
    );
    expect(match?.score).toBeGreaterThanOrEqual(85);
  });
});

describe("control visuals", () => {
  it("prefers reconciled over completed", () => {
    expect(
      visualStatusForRow({ status: "reconciled", dueUrgency: "overdue" })
    ).toBe("reconciled");
    expect(
      visualStatusForRow({ status: "pending", dueUrgency: "soon" })
    ).toBe("pending");
  });
});
