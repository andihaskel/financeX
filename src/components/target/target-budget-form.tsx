"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateAnnualBudgets, updateBudgets } from "@/app/actions/settings";
import { CategoryChip, PrimaryButton, SurfaceCard, SubsectionLabel } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { getCategoryVisual } from "@/lib/design/theme";
import { cn } from "@/lib/utils";

interface TargetRow {
  categoryId: string;
  name: string;
  slug: string;
  budget: number;
  actual: number;
}

function categoryProgress(row: Pick<TargetRow, "budget" | "actual">) {
  const hasBudget = row.budget > 0;
  const pct = hasBudget
    ? Math.min(100, (row.actual / row.budget) * 100)
    : row.actual > 0
      ? 100
      : 0;
  const over = hasBudget ? row.actual > row.budget : row.actual > 0;
  const left = row.budget - row.actual;

  return { hasBudget, pct, over, left };
}

type TargetBudgetFormProps = {
  data: TargetRow[];
  periodLabel: string;
} & (
  | { periodType: "month"; month: string }
  | { periodType: "year"; year: number }
);

export function TargetBudgetForm(props: TargetBudgetFormProps) {
  const { data, periodLabel, periodType } = props;
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const budgets = data
            .map((row) => {
              const value = Number(formData.get(row.categoryId));
              if (Number.isNaN(value)) return null;
              return { categoryId: row.categoryId, budgetAmount: value };
            })
            .filter((row): row is { categoryId: string; budgetAmount: number } => row !== null);

          const result =
            periodType === "year"
              ? await updateAnnualBudgets(props.year, budgets)
              : await updateBudgets(props.month, budgets);

          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`${periodLabel} target saved`);
        });
      }}
      className="space-y-6"
    >
      <SubsectionLabel>Category budgets</SubsectionLabel>
      <SurfaceCard className="px-5 py-1">
        {data.map((row) => {
          const visual = getCategoryVisual(row.slug);
          const { hasBudget, pct, over, left } = categoryProgress(row);

          return (
            <div
              key={row.categoryId}
              className="border-b border-[#F1EFF7] py-3 last:border-0"
            >
              <div className="mb-2 flex items-center gap-3">
                <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {row.name}
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-[#6E6B82]">
                  {row.actual > 0
                    ? hasBudget
                      ? `${formatMoney(row.actual)} spent`
                      : formatMoney(row.actual)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F1EFF7]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? "#EF4444" : "#6C3FD1",
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "hidden w-[4.5rem] shrink-0 text-right text-[11px] font-bold sm:inline",
                    over ? "text-[#EF4444]" : "text-[#6E6B82]"
                  )}
                >
                  {!hasBudget
                    ? row.actual > 0
                      ? "No target"
                      : ""
                    : over
                      ? `${formatMoney(Math.abs(left))} over`
                      : `${formatMoney(left)} left`}
                </span>
                <div className="flex w-[4.5rem] shrink-0 items-center justify-end gap-1">
                  <span className="text-xs font-bold text-[#9E9AB0]">$</span>
                  <input
                    name={row.categoryId}
                    type="number"
                    min={0}
                    step={periodType === "year" ? 50 : 10}
                    defaultValue={row.budget}
                    aria-label={`${row.name} target`}
                    className="w-[3.75rem] rounded-[10px] border border-[#E2DEF0] bg-[#FAF9FC] px-1.5 py-1.5 text-right text-xs font-bold outline-none focus:border-[#6C3FD1]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </SurfaceCard>

      <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving..." : `Save ${periodLabel} target`}
      </PrimaryButton>
    </form>
  );
}
