"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updateBudget } from "@/app/actions/settings";
import { CategoryChip, PrimaryButton, SurfaceCard } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { getCategoryVisual } from "@/lib/design/theme";

interface TargetRow {
  categoryId: string;
  name: string;
  slug: string;
  budget: number;
}

export function TargetBudgetForm({
  data,
  month,
  targetToSpend,
}: {
  data: TargetRow[];
  month: string;
  targetToSpend?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const total = targetToSpend ?? data.reduce((sum, row) => sum + row.budget, 0);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          for (const row of data) {
            const value = Number(formData.get(row.categoryId));
            if (Number.isNaN(value)) continue;
            const result = await updateBudget(row.categoryId, month, value);
            if (result.error) {
              toast.error(result.error);
              return;
            }
          }
          toast.success("Budget target saved");
        });
      }}
      className="space-y-6"
    >
      <SurfaceCard className="px-6 py-2">
        {data.map((row) => {
          const visual = getCategoryVisual(row.slug);
          const share = total > 0 ? Math.round((row.budget / total) * 100) : 0;
          return (
            <div
              key={row.categoryId}
              className="border-b border-[#F1EFF7] py-4 last:border-0"
            >
              <div className="mb-2.5 flex items-center gap-3.5">
                <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
                <span className="flex-1 text-sm font-semibold">{row.name}</span>
                <span className="text-sm font-semibold text-[#6E6B82]">
                  {share}% of target
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1EFF7]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${share}%`,
                      backgroundColor: visual.chipColor,
                    }}
                  />
                </div>
                <div className="flex w-28 shrink-0 items-center justify-end gap-2">
                  <span className="text-sm font-bold text-[#6E6B82]">$</span>
                  <input
                    name={row.categoryId}
                    type="number"
                    min={0}
                    step={10}
                    defaultValue={row.budget}
                    className="w-20 rounded-[12px] border border-[#E2DEF0] bg-[#FAF9FC] px-2 py-2 text-right text-sm font-bold outline-none focus:border-[#6C3FD1]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#6E6B82]">Total monthly target</p>
          <p className="text-2xl font-extrabold">{formatMoney(total)}</p>
        </div>
      </SurfaceCard>

      <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving..." : "Save target"}
      </PrimaryButton>
    </form>
  );
}
