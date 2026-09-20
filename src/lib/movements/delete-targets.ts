import { getAccountDisplayName, sortAccounts } from "@/lib/accounts/helpers";
import type { DeleteMovementsTarget } from "@/types/delete-movements";
import type { Account } from "@/types/database";

export type { DeleteMovementsTarget };

export function getDeleteMovementsTargets(
  accounts: Account[],
  rows: Array<{ account_id: string }>,
  selectedAccountId?: string
): DeleteMovementsTarget[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.account_id, (counts.get(row.account_id) ?? 0) + 1);
  }

  const accountIds = selectedAccountId
    ? [selectedAccountId]
    : sortAccounts(accounts).map((account) => account.id);

  return accountIds
    .map((accountId) => {
      const count = counts.get(accountId) ?? 0;
      if (count === 0) return null;

      const account = accounts.find((item) => item.id === accountId);
      if (!account) return null;

      return {
        accountId,
        accountLabel: getAccountDisplayName(account),
        count,
      };
    })
    .filter((target): target is DeleteMovementsTarget => target !== null);
}
