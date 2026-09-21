import type { AccountType, Currency } from "@/types/database";

export const CASH_LIKE_ACCOUNT_TYPES: AccountType[] = [
  "bank_account",
  "checking",
  "savings",
  "cash",
  "investment",
];

export function isCashLikeAccountType(type: AccountType): boolean {
  return CASH_LIKE_ACCOUNT_TYPES.includes(type);
}

export function computeAccountCashBalance(input: {
  openingBalance: number | null;
  openingBalanceDate: string | null;
  movements: { transaction_date: string; amount: number }[];
}): {
  balance: number;
  movementNet: number;
  hasAnchor: boolean;
} {
  const movementNet = input.movements.reduce((sum, tx) => sum + Number(tx.amount), 0);

  if (input.openingBalance == null) {
    return {
      balance: movementNet,
      movementNet,
      hasAnchor: false,
    };
  }

  const anchorDate = input.openingBalanceDate;
  const sinceAnchor = anchorDate
    ? input.movements
        .filter((tx) => tx.transaction_date >= anchorDate)
        .reduce((sum, tx) => sum + Number(tx.amount), 0)
    : movementNet;

  return {
    balance: Number(input.openingBalance) + sinceAnchor,
    movementNet: sinceAnchor,
    hasAnchor: true,
  };
}
