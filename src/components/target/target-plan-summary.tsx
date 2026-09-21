import Link from "next/link";

import { SurfaceCard } from "@/components/ui/surface";
import { formatMoney, formatPercent } from "@/lib/design/format";
import { cn } from "@/lib/utils";

export interface TargetPlanSummaryData {
  expectedIncome: number;
  goalToSave: number;
  savingsPercent: number;
  roomToSpend: number;
  targetToSpend: number;
  budgetGap: number;
  hasOwnBudgets: boolean;
}

export function TargetPlanSummary({
  monthLabel,
  summary,
}: {
  monthLabel: string;
  summary: TargetPlanSummaryData;
}) {
  const overBudget = summary.budgetGap > 0;
  const underBudget = summary.budgetGap < 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Expected income", value: formatMoney(summary.expectedIncome) },
          { label: "Room to spend", value: formatMoney(summary.roomToSpend) },
          { label: "Category target", value: formatMoney(summary.targetToSpend), warn: overBudget },
          {
            label: "Goal to save",
            value: formatMoney(summary.goalToSave),
            sub: formatPercent(summary.savingsPercent / 100),
            accent: true,
          },
        ].map((card) => (
          <SurfaceCard key={card.label} className="px-4 py-3.5">
            <p className="text-[12px] font-semibold text-[#6E6B82]">{card.label}</p>
            {"sub" in card && card.sub ? (
              <p className="mt-1 text-[11px] font-bold text-[#9E9AB0]">{card.sub}</p>
            ) : null}
            <p
              className={cn(
                "mt-1 text-lg font-extrabold",
                card.accent && "text-[#6C3FD1]",
                card.warn && "text-[#EF4444]"
              )}
            >
              {card.value}
            </p>
          </SurfaceCard>
        ))}
      </div>

      {overBudget && (
        <p className="text-xs font-semibold text-[#B91C1C]">
          Category targets are {formatMoney(summary.budgetGap)} above room to spend.
        </p>
      )}
      {underBudget && summary.targetToSpend > 0 && (
        <p className="text-xs font-semibold text-[#6C3FD1]">
          {formatMoney(Math.abs(summary.budgetGap))} unallocated vs room to spend.
        </p>
      )}

      <p className="text-xs font-semibold text-[#6E6B82]">
        Income and savings rate in{" "}
        <Link href="/settings?section=general" className="font-bold text-[#6C3FD1]">
          Settings
        </Link>
        .{" "}
        {!summary.hasOwnBudgets
          ? `${monthLabel} has no saved target yet — values below are copied from your latest plan.`
          : `Editing ${monthLabel}.`}
      </p>
    </div>
  );
}
