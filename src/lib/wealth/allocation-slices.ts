import type { DonutSlice } from "@/lib/spending/donut-slices";
import { getCategoryVisual } from "@/lib/design/theme";
import type { WealthPositionKind } from "@/types/database";

const OTHER_COLOR = "#94A3B8";
const CASH_COLOR = "#10B981";

export interface AllocationPositionInput {
  kind: WealthPositionKind;
  amountUsd: number;
}

export function buildWealthAllocationSlices(input: {
  accountCashUsd: number;
  positions: AllocationPositionInput[];
}): DonutSlice[] {
  let fixedIncomeUsd = 0;
  let equityUsd = 0;
  let otherUsd = 0;

  for (const position of input.positions) {
    const amount = Number(position.amountUsd);
    if (!Number.isFinite(amount) || amount === 0) continue;

    if (position.kind === "fixed_income") {
      fixedIncomeUsd += amount;
    } else if (position.kind === "equity" || position.kind === "investment") {
      equityUsd += amount;
    } else {
      otherUsd += amount;
    }
  }

  const cashUsd = Number.isFinite(input.accountCashUsd) ? input.accountCashUsd : 0;

  const slices: DonutSlice[] = [
    { name: "Cash", value: Math.max(0, cashUsd), color: CASH_COLOR },
    {
      name: "Renta fija",
      value: Math.max(0, fixedIncomeUsd),
      color: getCategoryVisual("renta-fija").chipColor,
    },
    {
      name: "Renta variable",
      value: Math.max(0, equityUsd),
      color: getCategoryVisual("renta-variable").chipColor,
    },
    { name: "Other", value: Math.max(0, otherUsd), color: OTHER_COLOR },
  ];

  return slices.filter((slice) => slice.value > 0);
}
