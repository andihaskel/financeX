"use client";

import { useMemo, useState } from "react";

import {
  MovementsFilters,
  type MovementsFilterValues,
  type MovementsSort,
} from "@/components/movements/movements-filters";
import { MovementsList } from "@/components/movements/movements-list";
import { SectionTitle, SurfaceCard } from "@/components/ui/surface";
import {
  categoriesForTransactionType,
  typeNeedsCategory,
} from "@/lib/categories/helpers";
import type { Account, Category, TransactionType, TransactionWithRelations } from "@/types/database";

const PAGE_SIZE = 10;

function parseSort(value: string | undefined): MovementsSort {
  return value === "amount" ? "amount" : "date";
}

function filtersFromInitial(initial: Record<string, string | undefined>): MovementsFilterValues {
  const extraordinary =
    initial.extraordinary === "yes" || initial.extraordinary === "1"
      ? "yes"
      : initial.extraordinary === "no" || initial.extraordinary === "0"
        ? "no"
        : "";

  return {
    account: initial.account ?? "",
    category: initial.category ?? "",
    type: initial.type ?? "",
    extraordinary,
    q: initial.q ?? "",
    sort: parseSort(initial.sort),
  };
}

function syncFiltersToUrl(
  filters: MovementsFilterValues,
  base: { month?: string; year?: string; from?: string }
) {
  const params = new URLSearchParams();
  if (base.year) params.set("year", base.year);
  if (base.month) params.set("month", base.month);
  if (base.from) params.set("from", base.from);
  if (filters.account) params.set("account", filters.account);
  if (filters.category) params.set("category", filters.category);
  if (filters.type) params.set("type", filters.type);
  if (filters.extraordinary) params.set("extraordinary", filters.extraordinary);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.sort !== "date") params.set("sort", filters.sort);
  const query = params.toString();
  const href = query ? `/movements?${query}` : "/movements";
  window.history.replaceState(window.history.state, "", href);
}

function matchesQuery(tx: TransactionWithRelations, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    (tx.description ?? "").toLowerCase().includes(needle) ||
    (tx.normalized_description ?? "").toLowerCase().includes(needle)
  );
}

function isExtraordinaryMovement(
  tx: TransactionWithRelations,
  categories: Category[]
) {
  if (tx.is_extraordinary) return true;
  const category =
    categories.find((item) => item.id === tx.category_id) ?? tx.categories ?? null;
  return category?.group === "extraordinary";
}

function compareByDate(a: TransactionWithRelations, b: TransactionWithRelations) {
  const byDate = b.transaction_date.localeCompare(a.transaction_date);
  if (byDate !== 0) return byDate;
  return (b.created_at ?? "").localeCompare(a.created_at ?? "");
}

function compareByAmount(a: TransactionWithRelations, b: TransactionWithRelations) {
  const byAbs = Math.abs(b.amount) - Math.abs(a.amount);
  if (byAbs !== 0) return byAbs;
  return compareByDate(a, b);
}

export function MovementsBrowser({
  month,
  year,
  accounts,
  categories,
  transactions,
  initialFilters,
}: {
  month: string;
  year?: string;
  accounts: Account[];
  categories: Category[];
  transactions: TransactionWithRelations[];
  initialFilters: Record<string, string | undefined>;
}) {
  const [filters, setFilters] = useState(() => filtersFromInitial(initialFilters));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function onFilterChange(key: keyof MovementsFilterValues, value: string) {
    setFilters((prev) => {
      const next: MovementsFilterValues = {
        ...prev,
        [key]: key === "sort" ? parseSort(value) : value,
      };

      if (key === "type") {
        if (value && typeNeedsCategory(value as TransactionType)) {
          const allowed = new Set(
            categoriesForTransactionType(categories, value as TransactionType).map((c) => c.id)
          );
          if (next.category && !allowed.has(next.category)) next.category = "";
        } else if (value) {
          next.category = "";
        }
      }

      syncFiltersToUrl(next, {
        month: year ? undefined : month,
        year,
        from: initialFilters.from,
      });
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  }

  const filtered = useMemo(() => {
    const rows = transactions.filter((tx) => {
      if (filters.account && tx.account_id !== filters.account) return false;
      if (filters.category && tx.category_id !== filters.category) return false;
      if (filters.type && tx.transaction_type !== filters.type) return false;
      if (filters.extraordinary === "yes" && !isExtraordinaryMovement(tx, categories)) {
        return false;
      }
      if (filters.extraordinary === "no" && isExtraordinaryMovement(tx, categories)) {
        return false;
      }
      if (!matchesQuery(tx, filters.q)) return false;
      return true;
    });

    return [...rows].sort(filters.sort === "amount" ? compareByAmount : compareByDate);
  }, [transactions, filters, categories]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return (
    <div className="space-y-4">
      <MovementsFilters
        month={month}
        year={year}
        accounts={accounts}
        categories={categories}
        filters={filters}
        onFilterChange={onFilterChange}
        from={initialFilters.from}
      />

      {filtered.length === 0 ? (
        <SurfaceCard className="py-12 text-center">
          <p className="font-bold">No movements match your filters.</p>
          <p className="mt-2 text-sm font-semibold text-[#6E6B82]">
            Try another month or clear filters.
          </p>
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <SectionTitle>
            {visible.length === filtered.length
              ? `${filtered.length} movement${filtered.length === 1 ? "" : "s"}`
              : `Showing ${visible.length} of ${filtered.length}`}
          </SectionTitle>
          <MovementsList
            transactions={visible}
            categories={categories}
            groupByDate={filters.sort === "date"}
          />
          {remaining > 0 && (
            <div className="border-t border-[#F1EFF7] pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="block w-full py-4 text-center text-sm font-bold text-[#6C3FD1] transition-colors hover:text-[#5A32B8]"
              >
                See {Math.min(remaining, PAGE_SIZE)} more
              </button>
            </div>
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
