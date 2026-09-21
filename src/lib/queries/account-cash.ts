import { cache } from "react";

import {
  computeAccountCashBalance,
  isCashLikeAccountType,
} from "@/lib/accounts/cash-balance";
import { getAccountDisplayName } from "@/lib/accounts/helpers";
import { convertToUsd } from "@/lib/currency/convert";
import { getUserSettings } from "@/lib/queries/finance";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Account, AccountType, Currency } from "@/types/database";

export interface AccountCashRow {
  id: string;
  name: string;
  displayName: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  balanceUsd: number;
  movementNet: number;
  hasAnchor: boolean;
  openingBalance: number | null;
  openingBalanceDate: string | null;
}

export interface AccountCashSummary {
  totalUsd: number;
  accounts: AccountCashRow[];
  unanchoredCount: number;
}

export const getAccountCashSummary = cache(async (): Promise<AccountCashSummary> => {
  const user = await getUser();
  if (!user) {
    return { totalUsd: 0, accounts: [], unanchoredCount: 0 };
  }

  const supabase = await createClient();
  const [settings, accountsResult, transactionsResult] = await Promise.all([
    getUserSettings(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("transactions")
      .select("account_id, amount, transaction_date")
      .eq("user_id", user.id),
  ]);

  const uyuRate = settings?.uyu_to_usd_rate ?? 40;
  const accounts = ((accountsResult.data ?? []) as Account[]).filter((account) =>
    isCashLikeAccountType(account.type)
  );

  const movementsByAccount = new Map<string, { transaction_date: string; amount: number }[]>();
  for (const tx of transactionsResult.data ?? []) {
    const list = movementsByAccount.get(tx.account_id) ?? [];
    list.push({
      transaction_date: tx.transaction_date,
      amount: Number(tx.amount),
    });
    movementsByAccount.set(tx.account_id, list);
  }

  const rows: AccountCashRow[] = accounts.map((account) => {
    const movements = movementsByAccount.get(account.id) ?? [];
    const openingBalance =
      account.opening_balance != null ? Number(account.opening_balance) : null;
    const computed = computeAccountCashBalance({
      openingBalance,
      openingBalanceDate: account.opening_balance_date,
      movements,
    });

    return {
      id: account.id,
      name: account.name,
      displayName: getAccountDisplayName(account),
      type: account.type,
      currency: account.currency,
      balance: computed.balance,
      balanceUsd: convertToUsd(computed.balance, account.currency, uyuRate),
      movementNet: computed.movementNet,
      hasAnchor: computed.hasAnchor,
      openingBalance,
      openingBalanceDate: account.opening_balance_date,
    };
  });

  return {
    totalUsd: rows.reduce((sum, row) => sum + row.balanceUsd, 0),
    accounts: rows,
    unanchoredCount: rows.filter((row) => !row.hasAnchor).length,
  };
});
