import Link from "next/link";

import { TargetBudgetForm } from "@/components/target/target-budget-form";
import { TargetPlanSummary } from "@/components/target/target-plan-summary";
import { TargetScopeNav } from "@/components/target/target-scope-nav";
import { TargetYearNav } from "@/components/target/target-year-nav";
import { PageTitleWithInfo } from "@/components/ui/surface";
import {
  getAnnualBudgetComparison,
  getAnnualTargetBudgets,
  getAnnualTargetSummary,
} from "@/lib/queries/finance";

function resolveYear(requested?: string): number {
  const parsed = requested ? Number(requested) : NaN;
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) {
    return parsed;
  }
  return new Date().getFullYear();
}

export default async function AnnualTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = resolveYear(params.year);
  const [budgetData, summary, comparison] = await Promise.all([
    getAnnualTargetBudgets(year),
    getAnnualTargetSummary(year),
    getAnnualBudgetComparison(year),
  ]);
  const actualByCategory = new Map(comparison.map((row) => [row.categoryId, row.actual]));

  return (
    <div className="space-y-5">
      <TargetScopeNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2.5">
        <PageTitleWithInfo title="Annual target" infoKey="target.annualPage" className="sm:mr-auto" />
        <TargetYearNav year={year} />
      </div>

      <p className="text-sm font-semibold text-[#6E6B82]">
        Category budgets for {year}. Bars show year-to-date spending; edit annual targets on
        the right.
      </p>

      <TargetPlanSummary
        periodLabel={String(year)}
        periodType="year"
        summary={summary}
      />

      <TargetBudgetForm
        periodType="year"
        year={year}
        periodLabel={String(year)}
        data={budgetData.map((row) => ({
          categoryId: row.categoryId,
          name: row.name,
          slug: row.slug,
          budget: row.budget,
          actual: actualByCategory.get(row.categoryId) ?? 0,
        }))}
      />
    </div>
  );
}
