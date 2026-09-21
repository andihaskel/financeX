import { TargetOverviewPanel } from "@/components/target/target-overview";
import { TargetScopeNav } from "@/components/target/target-scope-nav";
import { TargetYearNav } from "@/components/target/target-year-nav";
import { getTargetOverview } from "@/lib/queries/finance";
import { getAccountCashSummary } from "@/lib/queries/account-cash";
import { getWealthSummary } from "@/lib/queries/wealth";

function resolveYear(requested?: string): number {
  const parsed = requested ? Number(requested) : NaN;
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) {
    return parsed;
  }
  return new Date().getFullYear();
}

export default async function TargetOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = resolveYear(params.year);
  const [overview, wealth, cash] = await Promise.all([
    getTargetOverview(year),
    getWealthSummary(),
    getAccountCashSummary(),
  ]);

  return (
    <div className="space-y-5">
      <TargetScopeNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2.5">
        <h1 className="text-[26px] font-extrabold sm:mr-auto">Plan overview</h1>
        <TargetYearNav year={year} basePath="/target" />
      </div>

      <p className="text-sm font-semibold text-[#6E6B82]">
        Planned income from Settings vs what actually hit your accounts in {year}. Category
        detail lives in Monthly and Annual.
      </p>

      <TargetOverviewPanel
        data={overview}
        wealthTotalUsd={wealth.totalUsd}
        cashTotalUsd={cash.totalUsd}
      />
    </div>
  );
}
