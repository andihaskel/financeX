"use client";

import Link from "next/link";
import { useState } from "react";

import { CategoryChip } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { getCategoryVisual } from "@/lib/design/theme";
import { buildMovementsHref } from "@/lib/navigation/return-to";

const PAGE_SIZE = 5;

export interface AnnualCategoryRow {
  categoryId: string;
  name: string;
  slug: string;
  amount: number;
}

export function AnnualCategoryList({
  categories,
  maxAmount,
  year,
  returnTo,
}: {
  categories: AnnualCategoryRow[];
  maxAmount: number;
  year?: number;
  returnTo?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? categories : categories.slice(0, PAGE_SIZE);
  const hasMore = categories.length > PAGE_SIZE;

  function movementsHref(categoryId: string) {
    return buildMovementsHref({
      categoryId,
      year,
      returnTo,
    });
  }

  return (
    <>
      {visible.map((cat) => {
        const visual = getCategoryVisual(cat.slug);
        return (
          <Link
            key={cat.categoryId}
            href={movementsHref(cat.categoryId)}
            className="flex items-center gap-2 border-b border-[#F1EFF7] py-3.5 last:border-0 transition-colors hover:bg-[#FAF9FC] sm:gap-3.5"
          >
            <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:w-40 sm:flex-none sm:shrink-0">
              {cat.name}
            </span>
            <div className="hidden h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#F1EFF7] sm:block">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((cat.amount / maxAmount) * 100)}%`,
                  backgroundColor: visual.chipColor,
                }}
              />
            </div>
            <span className="shrink-0 text-right text-sm font-bold tabular-nums sm:w-24">
              {formatMoney(cat.amount)}
            </span>
          </Link>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block w-full py-4 text-sm font-bold text-[#6C3FD1]"
        >
          {expanded ? "Show less" : `See ${categories.length - PAGE_SIZE} more`}
        </button>
      )}
    </>
  );
}

export interface BudgetCategoryRow {
  categoryId: string;
  name: string;
  slug: string;
  budget: number;
  actual: number;
}

export function BudgetCategoryList({
  rows,
  month,
  returnTo,
}: {
  rows: BudgetCategoryRow[];
  month: string;
  returnTo?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;

  return (
    <>
      {visible.map((row) => {
        const hasBudget = row.budget > 0;
        const pct = hasBudget
          ? Math.min(100, (row.actual / row.budget) * 100)
          : row.actual > 0
            ? 100
            : 0;
        const over = hasBudget ? row.actual > row.budget : row.actual > 0;
        const left = row.budget - row.actual;
        const visual = getCategoryVisual(row.slug);

        return (
          <Link
            key={row.categoryId}
            href={buildMovementsHref({
              month,
              categoryId: row.categoryId,
              returnTo,
            })}
            className="block border-b border-[#F1EFF7] py-3.5 last:border-0 transition-colors hover:bg-[#FAF9FC]"
          >
            <div className="mb-2 flex items-center gap-3.5">
              <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
              <span className="flex-1 text-sm font-semibold">{row.name}</span>
              <span className="text-sm font-semibold text-[#6E6B82]">
                {hasBudget
                  ? `${formatMoney(row.actual)} of ${formatMoney(row.budget)}`
                  : formatMoney(row.actual)}
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1EFF7]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: over ? "#EF4444" : "#6C3FD1",
                  }}
                />
              </div>
              <span
                className={`w-24 shrink-0 text-right text-[13px] font-bold ${over ? "text-[#EF4444]" : "text-[#6E6B82]"}`}
              >
                {!hasBudget
                  ? "No budget"
                  : over
                    ? `${formatMoney(Math.abs(left))} over`
                    : `${formatMoney(left)} left`}
              </span>
            </div>
          </Link>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block w-full py-4 text-sm font-bold text-[#6C3FD1]"
        >
          {expanded ? "Show less" : `See ${rows.length - PAGE_SIZE} more`}
        </button>
      )}
    </>
  );
}
