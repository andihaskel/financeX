import { getMonthParam } from "@/components/dashboard/month-nav";
import { BudgetTable } from "@/components/budget/budget-table";
import { getBudgetComparison } from "@/lib/queries/finance";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = getMonthParam(params);
  const budgetData = await getBudgetComparison(month);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">Monthly category budgets vs actual spending</p>
      </div>
      <BudgetTable data={budgetData} month={month} />
    </div>
  );
}
