import { getAccountDisplayName } from "@/lib/accounts/helpers";
import type { Account, TransactionWithRelations, TransferDestinationKind } from "@/types/database";

export type TransferDestinationValue =
  | ""
  | "unset"
  | "external"
  | `account:${string}`
  | `wealth:${string}`;

export interface TransferDestinationOption {
  value: TransferDestinationValue;
  label: string;
  group: string;
}

export function encodeTransferDestination(input: {
  kind: TransferDestinationKind | "";
  accountId?: string | null;
  wealthPositionId?: string | null;
}): TransferDestinationValue {
  if (!input.kind) return "unset";
  if (input.kind === "external") return "external";
  if (input.kind === "internal_account" && input.accountId) {
    return `account:${input.accountId}`;
  }
  if (input.kind === "wealth_position" && input.wealthPositionId) {
    return `wealth:${input.wealthPositionId}`;
  }
  if (input.kind === "internal_account") return "";
  if (input.kind === "wealth_position") return "";
  return "unset";
}

export function decodeTransferDestination(value: TransferDestinationValue): {
  kind: TransferDestinationKind | "";
  accountId: string | null;
  wealthPositionId: string | null;
} {
  if (!value || value === "unset") {
    return { kind: "", accountId: null, wealthPositionId: null };
  }
  if (value === "external") {
    return { kind: "external", accountId: null, wealthPositionId: null };
  }
  if (value.startsWith("account:")) {
    return {
      kind: "internal_account",
      accountId: value.slice("account:".length),
      wealthPositionId: null,
    };
  }
  if (value.startsWith("wealth:")) {
    return {
      kind: "wealth_position",
      accountId: null,
      wealthPositionId: value.slice("wealth:".length),
    };
  }
  return { kind: "", accountId: null, wealthPositionId: null };
}

export function buildTransferDestinationOptions(
  accounts: Account[],
  wealthPositions: { id: string; name: string }[],
  sourceAccountId?: string
): TransferDestinationOption[] {
  const options: TransferDestinationOption[] = [
    { value: "unset", label: "Not set", group: "General" },
  ];

  for (const account of accounts) {
    if (account.id === sourceAccountId) continue;
    options.push({
      value: `account:${account.id}`,
      label: getAccountDisplayName(account),
      group: "My accounts",
    });
  }

  for (const position of wealthPositions) {
    options.push({
      value: `wealth:${position.id}`,
      label: position.name,
      group: "Wealth positions",
    });
  }

  options.push({
    value: "external",
    label: "Left tracked money",
    group: "General",
  });

  return options;
}

export function transferDestinationFromTransaction(
  tx: Pick<
    TransactionWithRelations,
    | "transfer_destination_kind"
    | "transfer_destination_account_id"
    | "transfer_destination_wealth_position_id"
  >
): TransferDestinationValue {
  return encodeTransferDestination({
    kind: tx.transfer_destination_kind ?? "",
    accountId: tx.transfer_destination_account_id,
    wealthPositionId: tx.transfer_destination_wealth_position_id,
  });
}

export function transferDestinationSummary(
  tx: Pick<
    TransactionWithRelations,
    | "transaction_type"
    | "transfer_destination_kind"
    | "transfer_destination_account_id"
    | "transfer_destination_wealth_position_id"
  >,
  accounts: Account[],
  wealthPositions: { id: string; name: string }[]
): string | null {
  if (tx.transaction_type !== "transfer") return null;

  const value = transferDestinationFromTransaction(tx);
  if (value === "unset") return "Not set";
  if (value === "external") return "Left tracked money";

  if (value.startsWith("account:")) {
    const account = accounts.find((item) => item.id === value.slice("account:".length));
    return account ? `→ ${getAccountDisplayName(account)}` : "→ My other account";
  }

  if (value.startsWith("wealth:")) {
    const position = wealthPositions.find((item) => item.id === value.slice("wealth:".length));
    return position ? `→ ${position.name}` : "→ Wealth position";
  }

  return null;
}

export function matchesTransferDestinationFilter(
  tx: Pick<
    TransactionWithRelations,
    | "transaction_type"
    | "transfer_destination_kind"
    | "transfer_destination_account_id"
    | "transfer_destination_wealth_position_id"
  >,
  filterValue: TransferDestinationValue
): boolean {
  if (!filterValue) return true;
  if (tx.transaction_type !== "transfer") return false;
  return transferDestinationFromTransaction(tx) === filterValue;
}

export function transferDestinationFilterLabel(
  value: TransferDestinationValue,
  accounts: Account[],
  wealthPositions: { id: string; name: string }[]
): string {
  if (!value) return "Transfer destination";
  const option = buildTransferDestinationOptions(accounts, wealthPositions).find(
    (item) => item.value === value
  );
  return option?.label ?? "Transfer destination";
}
