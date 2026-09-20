import Link from "next/link";

import { OpenImportButton } from "@/components/home/open-import-button";
import { YearChart } from "@/components/home/year-chart";
import { ImportCoverageCompact } from "@/components/accounts/import-coverage";
import { AddMovementsButton } from "@/components/layout/floating-add-button";
import { AnnualCategoryList } from "@/components/spending/category-spending-list";
import { SpendingBreakdown } from "@/components/spending/spending-breakdown";
import { slicesFromCategories } from "@/lib/spending/donut-slices";
import { GradientHero, SectionTitle, SurfaceCard } from "@/components/ui/surface";
import { formatMoney, formatPercent } from "@/lib/design/format";
import { getHomeYearData } from "@/lib/queries/year";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : new Date().getFullYear();
  const { summary, categories, coverageMap } = await getHomeYearData(year);
  const maxCat = Math.max(...categories.map((c) => c.amount), 1);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const mostExpensive = categories[0]?.name ?? "—";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="mr-auto text-sm font-bold text-[#6E6B82]">{year}</div>
        <AddMovementsButton month={currentMonth} />
      </div>

      <GradientHero>
        <div className="mb-2 flex items-center gap-3.5">
          <Link href={`/home?year=${year - 1}`} className="text-base opacity-70">
            ‹
          </Link>
          <h1 className="text-[26px] font-extrabold">{year}</h1>
          <Link href={`/home?year=${year + 1}`} className="text-base opacity-70">
            ›
          </Link>
        </div>
        <p className="mb-5 text-[15px] font-semibold opacity-85">How is {year} going?</p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Income", formatMoney(summary.totalIncome)],
            ["Spent", formatMoney(summary.totalSpent)],
            ["Saved", formatMoney(summary.totalSaved)],
            ["Savings rate", formatPercent(summary.savingsRate)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[18px] bg-white/15 px-4 py-4">
              <p className="text-[13px] opacity-80">{label}</p>
              <p className="mt-1.5 text-[22px] font-extrabold">{value}</p>
            </div>
          ))}
        </div>
      </GradientHero>

      <SectionTitle>Your months</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {summary.months.map((m) => (
          <Link
            key={m.month}
            href={`/month/${m.month}`}
            className={`relative rounded-2xl p-4 transition-shadow hover:shadow-md ${
              m.hasData
                ? "bg-white shadow-[0_6px_20px_rgba(28,27,41,0.06)]"
                : "border border-dashed border-[#E2DEF0] bg-[#FAF9FC]"
            }`}
          >
            {m.month === currentMonth && (
              <span className="absolute right-3.5 top-3 h-1.5 w-1.5 rounded-full bg-[#6C3FD1]" />
            )}
            <p
              className={`text-[13px] font-bold ${m.hasData ? "text-[#1C1B29]" : "text-[#9E9AB0]"}`}
            >
              {m.short}
            </p>
            {m.hasData ? (
              <>
                <p className="mt-2 text-[15px] font-extrabold">Saved {formatMoney(m.saved)}</p>
                <p className="mt-1 text-xs font-bold text-[#6C3FD1]">
                  {formatPercent(m.savingsRate)}
                </p>
                <ImportCoverageCompact accounts={coverageMap.get(m.month) ?? []} />
              </>
            ) : (
              <>
                <OpenImportButton month={m.month} className="mt-2 text-xs font-bold text-[#6C3FD1]">
                  + Add
                </OpenImportButton>
                <ImportCoverageCompact accounts={coverageMap.get(m.month) ?? []} />
              </>
            )}
          </Link>
        ))}
      </div>

      <SectionTitle>The year at a glance</SectionTitle>
      <SurfaceCard>
        <YearChart months={summary.months} />
      </SurfaceCard>

      <SectionTitle>A few things about your year</SectionTitle>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Average monthly spending", formatMoney(summary.avgSpending)],
          ["Average usual cost of living", formatMoney(summary.avgUsual)],
          ["Total extraordinary spending", formatMoney(summary.totalExtra)],
          ["Most expensive category", mostExpensive],
        ].map(([label, value]) => (
          <SurfaceCard key={label} className="p-[18px]">
            <p className="text-xs font-semibold text-[#6E6B82]">{label}</p>
            <p className="mt-1.5 text-lg font-extrabold">{value}</p>
          </SurfaceCard>
        ))}
      </div>

      {categories.length > 0 && (
        <>
          <SectionTitle>Where your money went</SectionTitle>
          <SurfaceCard className="px-6 py-4">
            <SpendingBreakdown
              slices={slicesFromCategories(
                categories.map((cat) => ({
                  name: cat.name,
                  slug: cat.slug,
                  amount: cat.amount,
                }))
              )}
            >
              <AnnualCategoryList
                categories={categories.map((cat) => ({
                  categoryId: cat.categoryId,
                  name: cat.name,
                  slug: cat.slug,
                  amount: cat.amount,
                }))}
                maxAmount={maxCat}
                year={year}
                returnTo={`/home?year=${year}`}
              />
            </SpendingBreakdown>
          </SurfaceCard>
        </>
      )}
    </div>
  );
}
