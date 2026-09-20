import { format, parseISO } from "date-fns";
import { Upload } from "lucide-react";

import { LinkButton } from "@/components/ui/link-button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getMonthParam, MonthNav } from "@/components/dashboard/month-nav";
import {
  BudgetVsActualChart,
  CompositionBarChart,
  MonthlyTrendChart,
  SpendingByCategoryChart,
} from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/currency/convert";
import {
  getBudgetComparison,
  getDashboardMetrics,
  getMonthTransactions,
  getMonthlyTrend,
} from "@/lib/queries/finance";
import { hasAnyTransactions, resolveViewMonth } from "@/lib/queries/month";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = await resolveViewMonth(params.month);
  const anyTransactions = await hasAnyTransactions();
  const { transactions } = await getMonthTransactions(month);
  const metrics = await getDashboardMetrics(month);
  const budgetData = await getBudgetComparison(month);
  const trendData = await getMonthlyTrend(month);

  const targetSavings = metrics.income * metrics.savingsTarget;
  const savingsDiff = metrics.savings - targetSavings;

  if (transactions.length === 0) {
    if (!anyTransactions) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
          <h1 className="text-2xl font-semibold">No transactions yet</h1>
          <p className="mt-2 text-muted-foreground">
            Import your bank and credit card CSV files to see your financial dashboard.
          </p>
          <LinkButton href="/import">
            <Upload className="mr-2 h-4 w-4" />
            Import your first CSV
          </LinkButton>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">No transactions in this month</h1>
        <p className="text-muted-foreground">
          {format(parseISO(`${month}-01`), "MMMM yyyy")} has no imported transactions. Use the
          month selector or check another view.
        </p>
        <div className="flex justify-center">
          <MonthNav month={month} />
        </div>
        <LinkButton href="/transactions" variant="outline">
          View all transactions
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your financial overview</p>
        </div>
        <MonthNav month={month} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Income" value={formatCurrency(metrics.income)} />
        <KpiCard label="Expenses" value={formatCurrency(metrics.totalSpending)} />
        <KpiCard
          label="Savings"
          value={formatCurrency(metrics.savings)}
          trend={metrics.savings >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Savings rate"
          value={formatPercent(metrics.savingsRate)}
          sublabel={`Target: ${formatPercent(metrics.savingsTarget)}`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CompositionBarChart
              data={[
                { name: "Sueldo", value: metrics.salaryIncome },
                { name: "Renta", value: metrics.propertyIncome },
                { name: "Otros", value: metrics.otherIncome },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CompositionBarChart
              data={[
                { name: "Core living", value: metrics.coreLiving },
                { name: "Discretionary", value: metrics.discretionary },
                { name: "Extraordinary", value: metrics.extraordinary },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Targets ({formatPercent(metrics.savingsTarget)})</span>
              <span className="font-medium">{formatCurrency(targetSavings)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual savings</span>
              <span className="font-medium">{formatCurrency(metrics.savings)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Difference</span>
              <span className={savingsDiff >= 0 ? "font-medium text-emerald-600" : "font-medium text-rose-600"}>
                {formatCurrency(savingsDiff)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingByCategoryChart
              data={metrics.spendingByCategory.map((c) => ({
                name: c.name,
                amount: Math.round(c.amount),
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs actual</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetVsActualChart data={budgetData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly trend</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart data={trendData} />
        </CardContent>
      </Card>
    </div>
  );
}
