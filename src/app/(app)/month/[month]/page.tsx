import Link from "next/link";
import { format, parseISO } from "date-fns";
import { notFound } from "next/navigation";

import { OpenImportButton } from "@/components/home/open-import-button";
import { MonthDataPanel } from "@/components/month/month-data-panel";
import { MonthEmptyHeader, MonthPageHeader } from "@/components/month/month-page-header";
import { MissingImportBadge } from "@/components/accounts/missing-import-badge";
import { BudgetCategoryList } from "@/components/spending/category-spending-list";
import { SpendingBreakdown } from "@/components/spending/spending-breakdown";
import { accountDotColor } from "@/lib/accounts/dot-color";
import { buildMovementsHref } from "@/lib/navigation/return-to";
import { getDeleteMovementsTargets } from "@/lib/movements/delete-targets";
import { slicesFromBudgetRows } from "@/lib/spending/donut-slices";
import {
  CategoryChip,
  GradientHero,
  SectionTitle,
  SurfaceCard,
} from "@/components/ui/surface";
import { formatMoney, formatPercent, formatTransactionAmount } from "@/lib/design/format";
import { getAccountDisplayName } from "@/lib/accounts/helpers";
import { getCategoryVisual } from "@/lib/design/theme";
import {
  getActiveAccounts,
  getBudgetComparison,
  getDashboardMetrics,
  getMonthTransactions,
} from "@/lib/queries/finance";
import { buildMonthImportCoverage } from "@/lib/queries/import-coverage";
import { getUser } from "@/lib/supabase/server";
import { ImportCoveragePanel } from "@/components/accounts/import-coverage";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();

  const user = await getUser();
  if (!user) notFound();

  const [{ transactions, categories }, accounts, metrics, budgets] = await Promise.all([
    getMonthTransactions(month),
    getActiveAccounts(),
    getDashboardMetrics(month),
    getBudgetComparison(month),
  ]);

  const deleteTargets = getDeleteMovementsTargets(
    accounts,
    transactions.map((transaction) => ({ account_id: transaction.account_id }))
  );
  const deleteCountByAccount = new Map(
    deleteTargets.map((target) => [target.accountId, target.count])
  );
  const importCoverage = buildMonthImportCoverage(
    month,
    accounts,
    new Set(transactions.map((transaction) => transaction.account_id))
  );

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const recent = transactions.slice(0, 5).map((tx) => {
    const account = accountById.get(tx.account_id) ?? null;
    const category = tx.category_id ? categoryById.get(tx.category_id) ?? null : null;
    return {
      id: tx.id,
      description: tx.description,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      currency: tx.currency,
      accounts: account
        ? { name: account.name, type: account.type, currency: account.currency }
        : null,
      categories: category ? { name: category.name, slug: category.slug } : null,
    };
  });

  const monthNameOnly = format(parseISO(`${month}-01`), "MMMM");

  if (transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-sm font-bold text-[#6E6B82]">
          <Link href="/home" className="hover:text-[#6C3FD1]">
            {month.slice(0, 4)}
          </Link>{" "}
          › {monthNameOnly}
        </div>
        <SurfaceCard className="px-10 py-14 text-center">
          <MonthEmptyHeader month={month} />
          <p className="text-base font-bold">Nothing here yet.</p>
          <p className="mt-2 text-sm font-semibold text-[#6E6B82]">
            Add your bank and card movements to see how {monthNameOnly} went.
          </p>
          <OpenImportButton month={month}>
            <span className="mt-6 inline-block rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white">
              + Add {monthNameOnly} movements
            </span>
          </OpenImportButton>
          <div className="mx-auto mt-6 max-w-sm text-left">
            <ImportCoveragePanel
              monthLabel={importCoverage.monthLabel}
              accounts={importCoverage.accounts}
            />
          </div>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="text-sm font-bold text-[#6E6B82]">
        <Link href="/home" className="hover:text-[#6C3FD1]">
          {month.slice(0, 4)}
        </Link>{" "}
        › {monthNameOnly}
      </div>

      <GradientHero>
        <MonthPageHeader month={month} />
        <p className="mb-2 text-[15px] font-semibold opacity-85">
          How did {monthNameOnly} go?
        </p>
        <MissingImportBadge month={month} accounts={importCoverage.accounts} />
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          <Link
            href={buildMovementsHref({
              month,
              type: "income",
              returnTo: `/month/${month}`,
            })}
            className="rounded-[18px] bg-white/15 px-4 py-4 transition-colors hover:bg-white/25"
          >
            <p className="text-[13px] opacity-80">Income</p>
            <p className="mt-1.5 text-2xl font-extrabold">{formatMoney(metrics.income)}</p>
          </Link>
          <Link
            href={buildMovementsHref({
              month,
              type: "expense",
              returnTo: `/month/${month}`,
            })}
            className="rounded-[18px] bg-white/15 px-4 py-4 transition-colors hover:bg-white/25"
          >
            <p className="text-[13px] opacity-80">Spent</p>
            <p className="mt-1.5 text-2xl font-extrabold">{formatMoney(metrics.totalSpending)}</p>
          </Link>
          <div className="col-span-2 rounded-[18px] bg-white/15 px-4 py-4 md:col-span-1">
            <div className="mb-1.5 flex items-start justify-between">
              <p className="text-[13px] opacity-80">Saved</p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#5F3DC4]">
                {formatPercent(metrics.savingsRate)}
              </span>
            </div>
            <p className="text-2xl font-extrabold">{formatMoney(metrics.savings)}</p>
          </div>
        </div>
      </GradientHero>

      <MonthDataPanel
        month={month}
        monthLabel={monthNameOnly}
        accounts={importCoverage.accounts.map((account) => ({
          id: account.id,
          name: account.name,
          shortLabel: account.shortLabel,
          imported: account.imported,
          count: deleteCountByAccount.get(account.id) ?? 0,
          color: accountDotColor(account.shortLabel),
        }))}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        <SurfaceCard>
          <p className="text-sm font-semibold text-[#6E6B82]">Your usual expenses</p>
          <p className="mt-1.5 text-[26px] font-extrabold">
            {formatMoney(metrics.coreLiving)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm font-semibold text-[#6E6B82]">Extra this month</p>
          <p className="mt-1.5 text-[26px] font-extrabold">
            {formatMoney(metrics.extraordinary)}
          </p>
          {metrics.extraordinary > 0 && (
            <Link
              href={buildMovementsHref({
                month,
                extraordinary: true,
                returnTo: `/month/${month}`,
              })}
              className="mt-0.5 inline-block text-[13px] font-semibold text-[#B45309] hover:underline"
            >
              See extraordinary →
            </Link>
          )}
        </SurfaceCard>
      </div>

      <SectionTitle>Where your money went</SectionTitle>
      <SurfaceCard className="px-6 py-4">
        {budgets.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-[#6E6B82]">
            No categorized spending this month.
          </p>
        ) : (
          <SpendingBreakdown
            slices={slicesFromBudgetRows(
              budgets.map((row) => ({
                name: row.name,
                slug: row.slug,
                actual: row.actual,
              }))
            )}
          >
            <BudgetCategoryList
              rows={budgets}
              month={month}
              returnTo={`/month/${month}`}
            />
          </SpendingBreakdown>
        )}
      </SurfaceCard>

      <SectionTitle>Recent movements</SectionTitle>
      <SurfaceCard className="px-6 py-1">
        {recent.map((tx) => {
          const visual = getCategoryVisual(tx.categories?.slug);
          const accountName = tx.accounts
            ? getAccountDisplayName(tx.accounts as Parameters<typeof getAccountDisplayName>[0])
            : "Unknown account";
          return (
            <div
              key={tx.id}
              className="flex items-center gap-3.5 border-b border-[#F1EFF7] py-4 last:border-0"
            >
              <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
              <div className="flex-1">
                <p className="text-sm font-bold">{tx.description}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#6E6B82]">
                  {format(parseISO(tx.transaction_date), "MMM d")} ·{" "}
                  {tx.categories?.name ?? "Uncategorized"} · {accountName}
                </p>
              </div>
              <p className="text-[15px] font-extrabold">
                {formatTransactionAmount(tx.amount, tx.currency)}
              </p>
            </div>
          );
        })}
        <Link
          href={buildMovementsHref({ month, returnTo: `/month/${month}` })}
          className="block py-4 text-sm font-bold text-[#6C3FD1]"
        >
          See all movements for {monthNameOnly} →
        </Link>
      </SurfaceCard>
    </div>
  );
}
