import Link from "next/link";

import { HomeMonthTiles } from "@/components/home/home-month-tiles";
import { YearChart } from "@/components/home/year-chart";
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
  const coverageRecord = Object.fromEntries(coverageMap.entries());

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
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <div className="rounded-[18px] bg-white/15 px-4 py-4">
            <p className="text-[13px] opacity-80">Income</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatMoney(summary.totalIncome)}
            </p>
          </div>
          <div className="rounded-[18px] bg-white/15 px-4 py-4">
            <p className="text-[13px] opacity-80">Spent</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatMoney(summary.totalSpent)}
            </p>
          </div>
          <div className="col-span-2 rounded-[18px] bg-white/15 px-4 py-4 md:hidden">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className="text-[13px] opacity-80">Saved</p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#5F3DC4]">
                {formatPercent(summary.savingsRate)}
              </span>
            </div>
            <p className="text-[22px] font-extrabold">{formatMoney(summary.totalSaved)}</p>
          </div>
          <div className="hidden rounded-[18px] bg-white/15 px-4 py-4 md:block">
            <p className="text-[13px] opacity-80">Saved</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatMoney(summary.totalSaved)}
            </p>
          </div>
          <div className="hidden rounded-[18px] bg-white/15 px-4 py-4 md:block">
            <p className="text-[13px] opacity-80">Savings rate</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatPercent(summary.savingsRate)}
            </p>
          </div>
        </div>
      </GradientHero>

      <SectionTitle>Your months</SectionTitle>
      <HomeMonthTiles
        year={year}
        months={summary.months}
        coverageMap={coverageRecord}
        currentMonth={currentMonth}
      />

      <SectionTitle>The year at a glance</SectionTitle>
      <SurfaceCard>
        <YearChart months={summary.months} />
      </SurfaceCard>

      <SectionTitle>A few things about your year</SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3.5">
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
