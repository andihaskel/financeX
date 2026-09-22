import Link from "next/link";

import { SurfaceCard, SubsectionLabel } from "@/components/ui/surface";
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
  spentYtd?: number;
}

function SummaryRow({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "danger";
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-semibold text-[#6E6B82]">{label}</span>
      <span
        className={cn(
          "font-bold tabular-nums",
          emphasis ? "text-base font-extrabold" : "text-sm",
          tone === "accent" && "text-[#6C3FD1]",
          tone === "danger" && "text-[#EF4444]",
          tone === "default" && "text-[#1C1B29]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TargetPlanSummary({
  periodLabel,
  periodType,
  summary,
}: {
  periodLabel: string;
  periodType: "month" | "year";
  summary: TargetPlanSummaryData;
}) {
  const overBudget = summary.budgetGap > 0;
  const underBudget = summary.budgetGap < 0;
  const isYear = periodType === "year";
  const spentYtd = summary.spentYtd ?? 0;
  const spentOverTarget =
    isYear && summary.targetToSpend > 0 && spentYtd > summary.targetToSpend;
  const spentLeft =
    isYear && summary.targetToSpend > 0
      ? summary.targetToSpend - spentYtd
      : null;

  return (
    <div className="space-y-2">
      <SurfaceCard className="px-5 py-4">
        <SubsectionLabel>
          Plan · {periodLabel}
        </SubsectionLabel>

        <div className="space-y-2">
          <SummaryRow
            label={isYear ? "Expected income (year)" : "Expected income"}
            value={formatMoney(summary.expectedIncome)}
          />
          <SummaryRow
            label={`Goal to save (${formatPercent(summary.savingsPercent / 100)})`}
            value={`− ${formatMoney(summary.goalToSave)}`}
            tone="accent"
          />

          <div className="border-t border-[#F1EFF7] pt-2">
            <SummaryRow
              label={isYear ? "Room to spend (year)" : "Room to spend"}
              value={formatMoney(summary.roomToSpend)}
              emphasis
            />
          </div>

          <SummaryRow
            label={isYear ? "Category target (year)" : "Category target"}
            value={formatMoney(summary.targetToSpend)}
            tone={overBudget ? "danger" : "default"}
          />

          {isYear && (
            <SummaryRow
              label="Spent YTD"
              value={
                summary.targetToSpend > 0 && spentLeft !== null
                  ? spentOverTarget
                    ? `${formatMoney(spentYtd)} · ${formatMoney(Math.abs(spentLeft))} over`
                    : `${formatMoney(spentYtd)} · ${formatMoney(spentLeft)} left`
                  : formatMoney(spentYtd)
              }
              tone={spentOverTarget ? "danger" : "default"}
            />
          )}
        </div>

        {overBudget && (
          <p className="mt-3 text-xs font-semibold text-[#B91C1C]">
            Category targets are{" "}
            <span className="tabular-nums">{formatMoney(summary.budgetGap)}</span> above room to
            spend.
          </p>
        )}
        {underBudget && summary.targetToSpend > 0 && (
          <p className="mt-3 text-xs font-semibold text-[#6C3FD1]">
            <span className="tabular-nums">{formatMoney(Math.abs(summary.budgetGap))}</span>{" "}
            unallocated vs room to spend.
          </p>
        )}
      </SurfaceCard>

      <p className="text-xs font-semibold text-[#6E6B82]">
        Income and savings in{" "}
        <Link href="/settings?section=general" className="font-bold text-[#6C3FD1]">
          Settings
        </Link>
        .{" "}
        {!summary.hasOwnBudgets
          ? isYear
            ? `No saved annual plan for ${periodLabel} — targets below are estimated from monthly plans.`
            : `No saved plan for ${periodLabel} — targets below copy your latest monthly plan.`
          : null}
      </p>
    </div>
  );
}
