import type { WealthPositionKind } from "@/types/database";

export const WEALTH_KIND_OPTIONS: { value: WealthPositionKind; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "investment", label: "Investment" },
  { value: "other", label: "Other" },
];

export function wealthKindLabel(kind: WealthPositionKind): string {
  return WEALTH_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Other";
}
