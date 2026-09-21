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
    <div className="space-y-4">
      <SurfaceCard className="px-6 py-5">
        <p className="text-[13px] font-semibold text-[#6E6B82]">Plan check · {monthLabel}</p>
        <div className="mt-4 space-y-2.5 text-sm font-semibold">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#6E6B82]">Expected income</span>
            <span className="font-bold text-[#1C1B29]">
              {formatMoney(summary.expectedIncome)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#6E6B82]">
              Goal to save ({formatPercent(summary.savingsPercent / 100)})
            </span>
            <span className="font-bold text-[#6C3FD1]">
              − {formatMoney(summary.goalToSave)}
            </span>
          </div>
          <div className="border-t border-[#F1EFF7] pt-2.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#1C1B29]">Room to spend</span>
              <span className="text-lg font-extrabold text-[#1C1B29]">
                {formatMoney(summary.roomToSpend)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#6E6B82]">Your category target</span>
            <span
              className={cn(
                "font-bold",
                overBudget ? "text-[#EF4444]" : "text-[#1C1B29]"
              )}
            >
              {formatMoney(summary.targetToSpend)}
            </span>
          </div>
        </div>

        {overBudget && (
          <p className="mt-4 rounded-[12px] bg-[#FEF2F2] px-3.5 py-3 text-xs font-semibold text-[#B91C1C]">
            Category targets are {formatMoney(summary.budgetGap)} above room to spend. Lower
            budgets or adjust income / savings in Settings.
          </p>
        )}
        {underBudget && summary.targetToSpend > 0 && (
          <p className="mt-4 rounded-[12px] bg-[#F3EDFF] px-3.5 py-3 text-xs font-semibold text-[#6C3FD1]">
            You still have {formatMoney(Math.abs(summary.budgetGap))} unallocated in your
            spending plan.
          </p>
        )}
        {!overBudget && !underBudget && summary.targetToSpend > 0 && (
          <p className="mt-4 text-xs font-semibold text-[#6E6B82]">
            Category targets match your income and savings goal.
          </p>
        )}
      </SurfaceCard>

      <p className="text-xs font-semibold text-[#6E6B82]">
        Expected income and savings rate live in{" "}
        <Link href="/settings?section=general" className="font-bold text-[#6C3FD1]">
          Settings → General
        </Link>
        .{" "}
        {!summary.hasOwnBudgets
          ? `Showing copied targets — ${monthLabel} has no saved budget yet. Save below to set this month.`
          : `Targets below apply to ${monthLabel}. Other months use their own saved target, or copy the latest one until set.`}
      </p>
    </div>
  );
}
