import type { SupabaseClient } from "@supabase/supabase-js";

import { convertCurrency, convertToUsd } from "@/lib/currency/convert";
import type { Currency, TransactionType } from "@/types/database";

export interface IncomeWealthLinkState {
  income_wealth_position_id: string | null;
  income_principal_amount: number | null;
}

export function getPaymentTotal(amount: number): number {
  return Math.abs(amount);
}

export function getIncomeInterestAmount(input: {
  amount: number;
  income_principal_amount?: number | null;
}): number {
  const total = getPaymentTotal(input.amount);
  const principal = Math.max(0, input.income_principal_amount ?? 0);
  return Math.max(0, total - Math.min(principal, total));
}

export function resolveIncomeWealthLink(input: {
  nextType: TransactionType;
  amount: number;
  positionId?: string | null;
  principalAmount?: number | null;
  existing?: IncomeWealthLinkState;
}): { link: IncomeWealthLinkState } | { error: string } {
  if (input.nextType !== "income") {
    return {
      link: {
        income_wealth_position_id: null,
        income_principal_amount: null,
      },
    };
  }

  const positionId =
    input.positionId !== undefined
      ? input.positionId
      : (input.existing?.income_wealth_position_id ?? null);
  const principalRaw =
    input.principalAmount !== undefined
      ? input.principalAmount
      : input.existing?.income_principal_amount;

  if (!positionId) {
    if (principalRaw != null && principalRaw > 0) {
      return { error: "Choose a wealth position for the capital portion" };
    }
    return {
      link: {
        income_wealth_position_id: null,
        income_principal_amount: null,
      },
    };
  }

  const principal = principalRaw == null ? 0 : Number(principalRaw);
  if (!Number.isFinite(principal) || principal < 0) {
    return { error: "Capital amount must be zero or greater" };
  }

  const total = getPaymentTotal(input.amount);
  if (principal > total) {
    return { error: "Capital cannot exceed the payment amount" };
  }

  return {
    link: {
      income_wealth_position_id: positionId,
      income_principal_amount: principal > 0 ? principal : null,
    },
  };
}

export function principalAmountInPositionCurrency(
  principalAmount: number,
  txCurrency: Currency,
  positionCurrency: Currency,
  uyuRate: number
): number {
  return convertCurrency(principalAmount, txCurrency, positionCurrency, uyuRate);
}

type PositionAdjustment = {
  positionId: string;
  delta: number;
};

export function buildIncomeWealthPositionAdjustments(input: {
  existingPositionId: string | null;
  existingPrincipal: number;
  existingTxCurrency: Currency;
  nextPositionId: string | null;
  nextPrincipal: number;
  nextTxCurrency: Currency;
  positions: Map<string, { amount: number; currency: Currency }>;
  uyuRate: number;
}): { adjustments: PositionAdjustment[] } | { error: string } {
  const adjustments = new Map<string, number>();

  function applyDelta(
    positionId: string | null,
    principal: number,
    txCurrency: Currency,
    direction: 1 | -1
  ) {
    if (!positionId || principal <= 0) return;

    const position = input.positions.get(positionId);
    if (!position) {
      throw new Error("POSITION_NOT_FOUND");
    }

    const converted = principalAmountInPositionCurrency(
      principal,
      txCurrency,
      position.currency,
      input.uyuRate
    );
    adjustments.set(positionId, (adjustments.get(positionId) ?? 0) + direction * converted);
  }

  try {
    applyDelta(input.existingPositionId, input.existingPrincipal, input.existingTxCurrency, 1);
    applyDelta(input.nextPositionId, input.nextPrincipal, input.nextTxCurrency, -1);
  } catch {
    return { error: "Wealth position not found" };
  }

  for (const [positionId, delta] of adjustments) {
    const position = input.positions.get(positionId);
    if (!position) continue;
    const nextAmount = Number(position.amount) + delta;
    if (nextAmount < -0.005) {
      return { error: "Capital exceeds the wealth position balance" };
    }
  }

  return {
    adjustments: [...adjustments.entries()]
      .filter(([, delta]) => Math.abs(delta) > 0.000001)
      .map(([positionId, delta]) => ({ positionId, delta })),
  };
}

export async function applyIncomeWealthPositionAdjustments(
  supabase: SupabaseClient,
  userId: string,
  adjustments: PositionAdjustment[]
): Promise<{ error?: string }> {
  for (const adjustment of adjustments) {
    const { data: position, error: fetchError } = await supabase
      .from("wealth_positions")
      .select("id, amount")
      .eq("id", adjustment.positionId)
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!position) return { error: "Wealth position not found" };

    const nextAmount = Math.max(0, Number(position.amount) + adjustment.delta);
    const { error: updateError } = await supabase
      .from("wealth_positions")
      .update({
        amount: Number(nextAmount.toFixed(2)),
        updated_at: new Date().toISOString(),
      })
      .eq("id", adjustment.positionId)
      .eq("user_id", userId);

    if (updateError) return { error: updateError.message };
  }

  return {};
}

export function incomeWealthSummary(
  input: {
    transaction_type: TransactionType;
    amount: number;
    currency: Currency;
    income_wealth_position_id?: string | null;
    income_principal_amount?: number | null;
  },
  wealthPositions: { id: string; name: string }[]
): string | null {
  if (input.transaction_type !== "income" || !input.income_wealth_position_id) {
    return null;
  }

  const position = wealthPositions.find(
    (item) => item.id === input.income_wealth_position_id
  );
  const label = position?.name ?? "Wealth position";
  const principal = input.income_principal_amount ?? 0;
  const interest = getIncomeInterestAmount(input);

  if (principal > 0) {
    return `→ ${label} · ${interest.toLocaleString("en-US", {
      maximumFractionDigits: input.currency === "UYU" ? 0 : 2,
    })} ${input.currency} interest`;
  }

  return `→ ${label}`;
}
