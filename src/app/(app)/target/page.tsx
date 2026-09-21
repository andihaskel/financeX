import { formatMonthLabel } from "@/lib/dates/month";
import { TargetBudgetForm } from "@/components/target/target-budget-form";
import { TargetMonthPicker } from "@/components/target/target-month-picker";
import { TargetPlanSummary } from "@/components/target/target-plan-summary";
import { getTargetBudgets, getTargetSummary } from "@/lib/queries/finance";
import { resolveViewMonth } from "@/lib/queries/month";

export default async function TargetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = await resolveViewMonth(params.month);
  const monthLabel = formatMonthLabel(month);
  const [budgetData, summary] = await Promise.all([
    getTargetBudgets(month),
    getTargetSummary(month),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold">Monthly target</h1>
          <p className="mt-1.5 max-w-xl text-sm font-semibold text-[#6E6B82]">
            Set category budgets for {monthLabel}. Each month keeps its own target; months
            without one copy the latest saved plan until you save here.
          </p>
        </div>
        <TargetMonthPicker month={month} />
      </div>

      <TargetPlanSummary monthLabel={monthLabel} summary={summary} />

      <TargetBudgetForm
        month={`${month}-01`}
        monthLabel={monthLabel}
        data={budgetData.map((row) => ({
          categoryId: row.categoryId,
          name: row.name,
          slug: row.slug,
          budget: row.budget,
        }))}
        roomToSpend={summary.roomToSpend}
      />
    </div>
  );
}
