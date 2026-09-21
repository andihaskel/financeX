"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ImportCoverageCompact } from "@/components/accounts/import-coverage";
import { OpenImportButton } from "@/components/home/open-import-button";
import { formatMoney, formatPercent } from "@/lib/design/format";
import type { AccountImportStatus } from "@/lib/queries/import-coverage";
import type { MonthSummary } from "@/lib/queries/year";
import { cn } from "@/lib/utils";

const MOBILE_COLS = 2;

function focusMonthIndex(year: number) {
  const now = new Date();
  if (year === now.getFullYear()) return now.getMonth();
  if (year < now.getFullYear()) return 11;
  return 0;
}

function MonthTile({
  month,
  currentMonth,
  coverage,
  className,
}: {
  month: MonthSummary;
  currentMonth: string;
  coverage: AccountImportStatus[];
  className?: string;
}) {
  return (
    <Link
      href={`/month/${month.month}`}
      className={cn(
        "relative rounded-2xl p-4 transition-shadow hover:shadow-md",
        month.hasData
          ? "bg-white shadow-[0_6px_20px_rgba(28,27,41,0.06)]"
          : "border border-dashed border-[#E2DEF0] bg-[#FAF9FC]",
        className
      )}
    >
      {month.month === currentMonth && (
        <span className="absolute right-3.5 top-3 h-1.5 w-1.5 rounded-full bg-[#6C3FD1]" />
      )}
      <p
        className={`text-[13px] font-bold ${month.hasData ? "text-[#1C1B29]" : "text-[#9E9AB0]"}`}
      >
        {month.short}
      </p>
      {month.hasData ? (
        <>
          <p className="mt-2 text-[15px] font-extrabold tabular-nums">Saved {formatMoney(month.saved)}</p>
          <p className="mt-1 text-xs font-bold text-[#6C3FD1] tabular-nums">
            {formatPercent(month.savingsRate)}
          </p>
          <ImportCoverageCompact accounts={coverage} />
        </>
      ) : (
        <>
          <OpenImportButton month={month.month} className="mt-2 text-xs font-bold text-[#6C3FD1]">
            + Add
          </OpenImportButton>
          <ImportCoverageCompact accounts={coverage} />
        </>
      )}
    </Link>
  );
}

export function HomeMonthTiles({
  year,
  months,
  coverageMap,
  currentMonth,
}: {
  year: number;
  months: MonthSummary[];
  coverageMap: Record<string, AccountImportStatus[]>;
  currentMonth: string;
}) {
  const focusRow = Math.floor(focusMonthIndex(year) / MOBILE_COLS);
  const maxRow = Math.floor((months.length - 1) / MOBILE_COLS);

  const [startRow, setStartRow] = useState(focusRow);
  const [endRow, setEndRow] = useState(focusRow);
  const [enterFrom, setEnterFrom] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    setStartRow(focusRow);
    setEndRow(focusRow);
    setEnterFrom({});
  }, [focusRow, year]);

  const mobileVisible = months.slice(
    startRow * MOBILE_COLS,
    Math.min(months.length, (endRow + 1) * MOBILE_COLS)
  );

  function markEntering(slice: MonthSummary[], direction: "up" | "down") {
    setEnterFrom((prev) => {
      const next = { ...prev };
      for (const month of slice) next[month.month] = direction;
      return next;
    });
  }

  function expandUp() {
    const nextRow = Math.max(0, startRow - 1);
    markEntering(
      months.slice(nextRow * MOBILE_COLS, startRow * MOBILE_COLS),
      "up"
    );
    setStartRow(nextRow);
  }

  function expandDown() {
    const nextRow = Math.min(maxRow, endRow + 1);
    markEntering(
      months.slice((endRow + 1) * MOBILE_COLS, (nextRow + 1) * MOBILE_COLS),
      "down"
    );
    setEndRow(nextRow);
  }

  return (
    <>
      <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-4">
        {months.map((m) => (
          <MonthTile
            key={m.month}
            month={m}
            currentMonth={currentMonth}
            coverage={coverageMap[m.month] ?? []}
          />
        ))}
      </div>

      <div className="space-y-2 md:hidden">
        {startRow > 0 && (
          <button
            type="button"
            onClick={expandUp}
            className="flex w-full items-center justify-center rounded-xl py-1.5 text-[#6C3FD1] transition-colors hover:bg-[#F3F1F9]"
            aria-label="Show earlier months"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          {mobileVisible.map((m) => {
            const direction = enterFrom[m.month];
            return (
              <MonthTile
                key={m.month}
                month={m}
                currentMonth={currentMonth}
                coverage={coverageMap[m.month] ?? []}
                className={
                  direction
                    ? cn(
                        "animate-in fade-in-0 duration-300 fill-mode-both",
                        direction === "up"
                          ? "slide-in-from-top-3"
                          : "slide-in-from-bottom-3"
                      )
                    : undefined
                }
              />
            );
          })}
        </div>

        {endRow < maxRow && (
          <button
            type="button"
            onClick={expandDown}
            className="flex w-full items-center justify-center rounded-xl py-1.5 text-[#6C3FD1] transition-colors hover:bg-[#F3F1F9]"
            aria-label="Show later months"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  );
}
