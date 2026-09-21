import { cache } from "react";

import { convertToUsd } from "@/lib/currency/convert";
import { getUserSettings } from "@/lib/queries/finance";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Account, WealthPosition } from "@/types/database";

export interface WealthPositionRow {
  id: string;
  name: string;
  kind: WealthPosition["kind"];
  amount: number;
  currency: WealthPosition["currency"];
  amountUsd: number;
  accountId: string | null;
  accountName: string | null;
  notes: string | null;
}

export interface WealthSummary {
  totalUsd: number;
  positionCount: number;
  positions: WealthPositionRow[];
}

export interface WealthFlowSummary {
  year: number;
  toPositionsUsd: number;
  externalOutUsd: number;
  internalOutUsd: number;
  unclassifiedOutCount: number;
}

export const getWealthSummary = cache(async (): Promise<WealthSummary> => {
  const user = await getUser();
  if (!user) {
    return { totalUsd: 0, positionCount: 0, positions: [] };
  }

  const supabase = await createClient();
  const [settings, positionsResult, accountsResult] = await Promise.all([
    getUserSettings(),
    supabase
      .from("wealth_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("accounts").select("*").eq("user_id", user.id).eq("active", true),
  ]);

  const uyuRate = settings?.uyu_to_usd_rate ?? 40;
  const accounts = (accountsResult.data ?? []) as Account[];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const positions = (positionsResult.data ?? []) as WealthPosition[];

  const rows: WealthPositionRow[] = positions.map((position) => ({
    id: position.id,
    name: position.name,
    kind: position.kind,
    amount: Number(position.amount),
    currency: position.currency,
    amountUsd: convertToUsd(Number(position.amount), position.currency, uyuRate),
    accountId: position.account_id,
    accountName: position.account_id
      ? (accountById.get(position.account_id)?.name ?? null)
      : null,
    notes: position.notes,
  }));

  return {
    totalUsd: rows.reduce((sum, row) => sum + row.amountUsd, 0),
    positionCount: rows.length,
    positions: rows,
  };
});

export const getWealthFlowSummary = cache(async (year: number): Promise<WealthFlowSummary> => {
  const empty: WealthFlowSummary = {
    year,
    toPositionsUsd: 0,
    externalOutUsd: 0,
    internalOutUsd: 0,
    unclassifiedOutCount: 0,
  };

  const user = await getUser();
  if (!user) return empty;

  const supabase = await createClient();
  const settings = await getUserSettings();
  const uyuRate = settings?.uyu_to_usd_rate ?? 40;
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data: transfers } = await supabase
    .from("transactions")
    .select("amount, currency, transfer_destination_kind")
    .eq("user_id", user.id)
    .eq("transaction_type", "transfer")
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  let toPositionsUsd = 0;
  let externalOutUsd = 0;
  let internalOutUsd = 0;
  let unclassifiedOutCount = 0;

  for (const row of transfers ?? []) {
    if (Number(row.amount) >= 0) continue;

    const usd = convertToUsd(Math.abs(Number(row.amount)), row.currency, uyuRate);

    switch (row.transfer_destination_kind) {
      case "wealth_position":
        toPositionsUsd += usd;
        break;
      case "external":
        externalOutUsd += usd;
        break;
      case "internal_account":
        internalOutUsd += usd;
        break;
      default:
        unclassifiedOutCount += 1;
        break;
    }
  }

  return {
    year,
    toPositionsUsd,
    externalOutUsd,
    internalOutUsd,
    unclassifiedOutCount,
  };
});
