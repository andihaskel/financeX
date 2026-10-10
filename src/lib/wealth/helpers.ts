import type { WealthPositionKind } from "@/types/database";

export const WEALTH_KIND_OPTIONS: { value: WealthPositionKind; label: string }[] = [
  { value: "fixed_income", label: "Renta fija" },
  { value: "equity", label: "Renta variable" },
  { value: "cash", label: "Cash" },
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "other", label: "Other" },
];

export function wealthKindLabel(kind: WealthPositionKind): string {
  if (kind === "investment") return "Renta variable";
  return WEALTH_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Other";
}
