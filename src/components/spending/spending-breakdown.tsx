"use client";

import { SpendingDonutChart } from "@/components/charts/spending-donut-chart";
import type { DonutSlice } from "@/lib/spending/donut-slices";
import { cn } from "@/lib/utils";

export function SpendingBreakdown({
  slices,
  children,
  className,
}: {
  slices: DonutSlice[];
  children: React.ReactNode;
  className?: string;
}) {
  const hasDonut = slices.some((slice) => slice.value > 0);

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[220px_1fr]", className)}>
      {hasDonut && (
        <div className="flex items-start justify-center lg:justify-start">
          <SpendingDonutChart slices={slices} className="w-full max-w-[220px]" />
        </div>
      )}
      <div className={hasDonut ? "" : "lg:col-span-2"}>{children}</div>
    </div>
  );
}
