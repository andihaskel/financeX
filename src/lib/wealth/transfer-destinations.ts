import type { TransferDestinationKind } from "@/types/database";

export const TRANSFER_DESTINATION_OPTIONS: {
  value: TransferDestinationKind | "";
  label: string;
  description: string;
}[] = [
  {
    value: "",
    label: "Not set",
    description: "Transfer is not classified yet.",
  },
  {
    value: "internal_account",
    label: "My other account",
    description: "Money moved between accounts you track. Neutral for total wealth.",
  },
  {
    value: "wealth_position",
    label: "Wealth position",
    description: "Money moved into a balance you track in Wealth.",
  },
  {
    value: "external",
    label: "Left tracked money",
    description: "Money left your tracked system (cash out, gift, etc.).",
  },
];

export function transferDestinationLabel(kind: TransferDestinationKind | null | undefined): string {
  if (!kind) return "Not set";
  return (
    TRANSFER_DESTINATION_OPTIONS.find((option) => option.value === kind)?.label ?? "Not set"
  );
}
