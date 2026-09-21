import Link from "next/link";

import { GradientHero, SurfaceCard } from "@/components/ui/surface";
import { formatMoney, formatPercent, formatSignedDelta } from "@/lib/design/format";
import type { TargetOverviewData } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

function OverviewRow({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "danger" | "muted";
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-semibold text-[#6E6B82]">{label}</span>
      <span
        className={cn(
          "font-bold tabular-nums",
          emphasis ? "text-base font-extrabold" : "text-sm",
          tone === "accent" && "text-[#6C3FD1]",
          tone === "danger" && "text-[#EF4444]",
          tone === "muted" && "text-[#9E9AB0]",
          tone === "default" && "text-[#1C1B29]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PlanGapNote({ gap, label }: { gap: number; label: string }) {
  if (gap > 0) {
    return (
      <p className="mt-2 text-xs font-semibold text-[#B91C1C]">
        {formatMoney(gap)} above room to spend in {label}.
      </p>
    );
  }

  if (gap < 0) {
    return (
      <p className="mt-2 text-xs font-semibold text-[#6C3FD1]">
        {formatMoney(Math.abs(gap))} unallocated in {label}.
      </p>
    );
  }

  return (
    <p className="mt-2 text-xs font-semibold text-[#6E6B82]">
      Category targets match room to spend in {label}.
    </p>
  );
}

export function TargetOverviewPanel({
  data,
  wealthTotalUsd = 0,
  cashTotalUsd = 0,
}: {
  data: TargetOverviewData;
  wealthTotalUsd?: number;
  cashTotalUsd?: number;
}) {
  const extraIncomeYear = data.incomeDeltaAnnual > 0;
  const missingIncomeYear = data.incomeDeltaAnnual < 0;
  const extraIncomeYtd = data.incomeDeltaYtd > 0;
  const missingIncomeYtd = data.incomeDeltaYtd < 0;
  const overSpent = data.spentVsRoomYtd > 0;
  const underSaved = data.savedVsGoalYtd < 0;
  const yearInProgress = data.throughMonth > 0 && data.throughMonth < 12;
  const actualIncomeNote = yearInProgress
    ? `All income imported in ${data.year} through month ${data.throughMonth}.`
    : `All income imported in ${data.year}.`;

  return (
    <div className="space-y-4">
      <GradientHero className="px-6 py-5">
        <p className="mb-1 text-[12px] font-bold uppercase tracking-wide opacity-75">
          Global income · {data.year}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[13px] font-semibold opacity-80">Planned (year)</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatMoney(data.plannedIncomeAnnual)}
            </p>
            <p className="mt-1 text-[11px] font-semibold opacity-70">
              {formatMoney(data.plannedIncomeMonthly)}/mo from Settings
            </p>
          </div>
          <div>
            <p className="text-[13px] font-semibold opacity-80">Actual (year)</p>
            <p className="mt-1.5 text-[22px] font-extrabold">
              {formatMoney(data.actualIncomeYear)}
            </p>
            <p className="mt-1 text-[11px] font-semibold opacity-70">{actualIncomeNote}</p>
          </div>
          <div>
            <p className="text-[13px] font-semibold opacity-80">vs plan (year)</p>
            <p
              className={cn(
                "mt-1.5 text-[22px] font-extrabold",
                extraIncomeYear && "text-white",
                missingIncomeYear && "text-[#FFD4D4]"
              )}
            >
              {formatSignedDelta(data.incomeDeltaAnnual)}
            </p>
            <p className="mt-1 text-[11px] font-semibold opacity-70">
              {extraIncomeYear
                ? "Extra from one-offs, other banks, etc."
                : missingIncomeYear
                  ? "Still below recurring plan"
                  : "Matches recurring plan"}
            </p>
          </div>
        </div>
      </GradientHero>

      <SurfaceCard className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Net worth tracked
          </p>
          <p className="mt-1 text-lg font-extrabold tabular-nums">
            {formatMoney(wealthTotalUsd + cashTotalUsd)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6E6B82]">
            {formatMoney(cashTotalUsd)} cash in accounts · {formatMoney(wealthTotalUsd)} tracked
            positions
          </p>
        </div>
        <Link
          href="/wealth"
          className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[#E2DEF0] bg-white px-5 py-2.5 text-sm font-bold text-[#6C3FD1] transition-colors hover:bg-[#FAF9FC]"
        >
          Manage wealth →
        </Link>
      </SurfaceCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Plan base · {data.year}
          </p>
          <div className="space-y-2">
            <OverviewRow
              label="Expected income / month"
              value={formatMoney(data.plannedIncomeMonthly)}
            />
            <OverviewRow
              label={`Goal to save (${formatPercent(data.savingsPercent / 100)})`}
              value={`− ${formatMoney(data.goalToSaveMonthly)}`}
              tone="accent"
            />
            <div className="border-t border-[#F1EFF7] pt-2">
              <OverviewRow
                label="Room to spend / month"
                value={formatMoney(data.roomToSpendMonthly)}
                emphasis
              />
            </div>
            <OverviewRow
              label="Room to spend / year"
              value={formatMoney(data.roomToSpendAnnual)}
            />
          </div>
          <Link
            href="/settings?section=general"
            className="mt-3 inline-block text-xs font-bold text-[#6C3FD1]"
          >
            Edit income sources →
          </Link>
        </SurfaceCard>

        <SurfaceCard className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Income pace · YTD
          </p>
          <div className="space-y-2">
            <OverviewRow
              label="Planned income YTD"
              value={formatMoney(data.plannedIncomeYtd)}
            />
            <OverviewRow
              label="Actual income YTD"
              value={formatMoney(data.actualIncomeYtd)}
              emphasis
            />
            <OverviewRow
              label={
                extraIncomeYtd ? "Extra vs pace" : missingIncomeYtd ? "Below pace" : "Vs pace"
              }
              value={formatSignedDelta(data.incomeDeltaYtd)}
              tone={extraIncomeYtd ? "accent" : missingIncomeYtd ? "danger" : "muted"}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-[#6E6B82]">
            Pace compares recurring plan through {data.throughMonth} month
            {data.throughMonth === 1 ? "" : "s"} vs what actually arrived.
          </p>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceCard className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Plan check
          </p>
          <div className="space-y-3">
            <div>
              <OverviewRow
                label={`Category target · ${data.monthly.monthLabel}`}
                value={formatMoney(data.monthly.targetToSpend)}
                tone={data.monthly.budgetGap > 0 ? "danger" : "default"}
              />
              <PlanGapNote gap={data.monthly.budgetGap} label={data.monthly.monthLabel} />
            </div>
            <div className="border-t border-[#F1EFF7] pt-3">
              <OverviewRow
                label={`Category target · ${data.year}`}
                value={formatMoney(data.annual.targetToSpend)}
                tone={data.annual.budgetGap > 0 ? "danger" : "default"}
              />
              <PlanGapNote gap={data.annual.budgetGap} label={String(data.year)} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="px-5 py-4">
          <p className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Spending & savings · YTD
          </p>
          <div className="space-y-2">
            <OverviewRow label="Spent YTD" value={formatMoney(data.actualSpentYtd)} />
            <OverviewRow
              label="Room to spend YTD"
              value={formatMoney(data.roomToSpendYtd)}
            />
            <OverviewRow
              label="Vs room to spend"
              value={
                overSpent
                  ? `${formatMoney(data.spentVsRoomYtd)} over`
                  : `${formatMoney(Math.abs(data.spentVsRoomYtd))} under`
              }
              tone={overSpent ? "danger" : "accent"}
            />
            <div className="border-t border-[#F1EFF7] pt-2">
              <OverviewRow label="Saved YTD" value={formatMoney(data.actualSavedYtd)} />
              <OverviewRow
                label="Save goal YTD"
                value={formatMoney(data.goalToSaveYtd)}
              />
              <OverviewRow
                label="Vs save goal"
                value={
                  underSaved
                    ? `${formatMoney(Math.abs(data.savedVsGoalYtd))} short`
                    : `${formatMoney(data.savedVsGoalYtd)} ahead`
                }
                tone={underSaved ? "danger" : "accent"}
              />
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/target/month?month=${data.monthly.month}`}
          className="rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(108,63,209,0.35)] transition-opacity hover:opacity-90"
        >
          Edit {data.monthly.monthLabel} categories
        </Link>
        <Link
          href={`/target/annual?year=${data.year}`}
          className="rounded-[14px] border border-[#E2DEF0] bg-white px-5 py-2.5 text-sm font-bold text-[#6C3FD1] transition-colors hover:bg-[#FAF9FC]"
        >
          Edit {data.year} annual plan
        </Link>
      </div>
    </div>
  );
}
