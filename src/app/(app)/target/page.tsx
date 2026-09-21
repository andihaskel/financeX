import { formatMonthLabel } from "@/lib/dates/month";
import { TargetBudgetForm } from "@/components/target/target-budget-form";
import { TargetMonthNav } from "@/components/target/target-month-nav";
import { TargetPlanSummary } from "@/components/target/target-plan-summary";
import { TargetScopeNav } from "@/components/target/target-scope-nav";
import { getTargetBudgets, getTargetSummary, getBudgetComparison } from "@/lib/queries/finance";
import { resolveViewMonth } from "@/lib/queries/month";

export default async function TargetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = await resolveViewMonth(params.month);
  const monthLabel = formatMonthLabel(month);
  const [budgetData, summary, comparison] = await Promise.all([
    getTargetBudgets(month),
    getTargetSummary(month),
    getBudgetComparison(month),
  ]);
  const actualByCategory = new Map(comparison.map((row) => [row.categoryId, row.actual]));

  return (
    <div className="space-y-5">
      <TargetScopeNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2.5">
        <h1 className="text-[26px] font-extrabold sm:mr-auto">Monthly target</h1>
        <TargetMonthNav month={month} />
      </div>

      <p className="text-sm font-semibold text-[#6E6B82]">
        Category budgets for {monthLabel}. Bars show what you spent; edit targets on the right.
      </p>

      <TargetPlanSummary
        periodLabel={monthLabel}
        periodType="month"
        summary={summary}
      />

      <TargetBudgetForm
        periodType="month"
        month={`${month}-01`}
        periodLabel={monthLabel}
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
