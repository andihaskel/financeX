"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { completeImport } from "@/app/actions/import";
import { bulkAssignReviewCategory, saveReviewTransaction } from "@/app/actions/transactions";
import { ReviewTransactionRow } from "@/components/review/review-transaction-row";
import { GradientHero, PrimaryButton, SurfaceCard } from "@/components/ui/surface";
import { guessCategoryFromDescription, isNeedsReviewForImport, isSuggestedByAiForImport } from "@/lib/categorization/openai-classify";
import type { Category, Transaction } from "@/types/database";
import { cn } from "@/lib/utils";

type ReviewFilter = "all" | "suggested" | "needs_review";

const FILTER_OPTIONS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "suggested", label: "Reviewed" },
  { value: "needs_review", label: "Needs review" },
];

const ALL_CATEGORIES = "";
const UNCATEGORIZED = "__uncategorized__";

interface ReviewPanelProps {
  importId: string;
  filename: string;
  monthLabel: string;
  transactions: Transaction[];
  categories: Category[];
  stats: {
    auto: number;
    suggested: number;
    needsReview: number;
    needsHelp: number;
  };
  viewMonth: string;
}

function sortForReview(transactions: Transaction[]) {
  const rank = (transaction: Transaction) => {
    if (transaction.categorization_status === "needs_review") return 0;
    if (transaction.categorization_status === "suggested") return 1;
    if (transaction.categorization_status === "auto") return 2;
    return 3;
  };

  return [...transactions].sort((a, b) => rank(a) - rank(b));
}

function needsReviewBucket(
  transaction: Transaction,
  importStatus: Map<string, Transaction["categorization_status"]>,
  categories: Category[]
) {
  const status = importStatus.get(transaction.id) ?? transaction.categorization_status;
  return isNeedsReviewForImport(status, transaction, categories);
}

function suggestedByAiBucket(
  transaction: Transaction,
  importStatus: Map<string, Transaction["categorization_status"]>,
  categories: Category[]
) {
  const status = importStatus.get(transaction.id) ?? transaction.categorization_status;
  return isSuggestedByAiForImport(status, transaction, categories);
}

function isReviewed(transaction: Transaction, confirmedIds: Set<string>) {
  return (
    transaction.categorization_status === "manual" ||
    transaction.categorization_status === "auto" ||
    confirmedIds.has(transaction.id)
  );
}

function StatPill({
  label,
  value,
  dotColor,
}: {
  label: string;
  value: number;
  dotColor: string;
}) {
  if (value === 0) return null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
      {value} {label}
    </span>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
        active
          ? "bg-white text-[#1C1B29] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
          : "bg-transparent text-[#6E6B82] hover:text-[#1C1B29]"
      )}
    >
      {label}
    </button>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="inline-block rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)]">
        {label}
      </span>
    </div>
  );
}

import { spendingCategories } from "@/lib/categories/helpers";

function BulkAssignBar({
  selectedCount,
  categories,
  disabled,
  onAssign,
  onCancel,
}: {
  selectedCount: number;
  categories: Category[];
  disabled: boolean;
  onAssign: (categoryId: string) => void;
  onCancel: () => void;
}) {
  const assignable = spendingCategories(categories);
  return (
    <div className="sticky top-0 z-10 -mx-5 border-b border-[#E8E4F4] bg-[#EDE9FE] px-5 py-3">
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-[13px] font-bold text-[#6C3FD1]">
          {selectedCount} selected · assign to:
        </p>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
          {assignable.map((category) => (
            <button
              key={category.id}
              type="button"
              disabled={disabled}
              onClick={() => onAssign(category.id)}
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4B4860] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:text-[#6C3FD1] disabled:opacity-50"
            >
              {category.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="shrink-0 text-[13px] font-bold text-[#6C3FD1] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ReviewPanel({
  importId,
  filename,
  monthLabel,
  transactions,
  categories,
  stats,
  viewMonth,
}: ReviewPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [localCategories, setLocalCategories] = useState<Map<string, string | null>>(
    new Map()
  );
  const [filter, setFilter] = useState<ReviewFilter>("needs_review");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const importStatus = useMemo(
    () => new Map(transactions.map((transaction) => [transaction.id, transaction.categorization_status])),
    [transactions]
  );

  const otrosCategoryId = useMemo(
    () => categories.find((category) => category.slug === "otros")?.id ?? null,
    [categories]
  );

  const mergedTransactions = useMemo(
    () =>
      transactions.map((transaction) => {
        const localCategoryId = localCategories.get(transaction.id);
        let category_id =
          localCategoryId !== undefined ? localCategoryId : transaction.category_id;

        const needsReview = needsReviewBucket(transaction, importStatus, categories);
        const suggestedByAi = suggestedByAiBucket(transaction, importStatus, categories);
        const isOtros = category_id === otrosCategoryId;

        if (needsReview) {
          category_id =
            localCategoryId !== undefined
              ? localCategoryId
              : isOtros
                ? null
                : transaction.category_id;
        } else if (suggestedByAi && (!category_id || isOtros)) {
          const guessed = guessCategoryFromDescription(
            transaction.normalized_description,
            categories
          );
          if (guessed) {
            category_id = guessed.id;
          }
        }

        if (category_id === transaction.category_id && localCategoryId === undefined) {
          return transaction;
        }

        return { ...transaction, category_id };
      }),
    [categories, importStatus, localCategories, otrosCategoryId, transactions]
  );

  const sorted = useMemo(() => sortForReview(mergedTransactions), [mergedTransactions]);

  const tabFiltered = useMemo(() => {
    switch (filter) {
      case "suggested":
        return sorted.filter((transaction) =>
          suggestedByAiBucket(transaction, importStatus, categories)
        );
      case "needs_review":
        return sorted.filter((transaction) =>
          needsReviewBucket(transaction, importStatus, categories)
        );
      default:
        return sorted;
    }
  }, [categories, filter, importStatus, sorted]);

  const categoryFilterOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: ALL_CATEGORIES, label: "All categories" },
    ];

    const hasUncategorized = tabFiltered.some((transaction) => !transaction.category_id);
    if (hasUncategorized) {
      options.push({ value: UNCATEGORIZED, label: "Uncategorized" });
    }

    const categoryIds = new Set(
      tabFiltered
        .map((transaction) => transaction.category_id)
        .filter((categoryId): categoryId is string => Boolean(categoryId))
    );

    for (const category of categories) {
      if (categoryIds.has(category.id)) {
        options.push({ value: category.id, label: category.name });
      }
    }

    return options;
  }, [categories, tabFiltered]);

  useEffect(() => {
    if (categoryFilterOptions.some((option) => option.value === categoryFilter)) {
      return;
    }
    setCategoryFilter(ALL_CATEGORIES);
  }, [categoryFilter, categoryFilterOptions]);

  const filtered = useMemo(() => {
    if (!categoryFilter) {
      return tabFiltered;
    }

    if (categoryFilter === UNCATEGORIZED) {
      return tabFiltered.filter((transaction) => !transaction.category_id);
    }

    return tabFiltered.filter((transaction) => transaction.category_id === categoryFilter);
  }, [categoryFilter, tabFiltered]);

  const categoryFilterLabel =
    categoryFilterOptions.find((option) => option.value === categoryFilter)?.label ??
    "All categories";

  function handleFilterChange(nextFilter: ReviewFilter) {
    setFilter(nextFilter);
    setCategoryFilter(ALL_CATEGORIES);
    setSelectedIds(new Set());
  }

  const selectableFiltered = useMemo(
    () =>
      filtered.filter((transaction) => importStatus.get(transaction.id) !== "auto"),
    [filtered, importStatus]
  );

  useEffect(() => {
    const visibleIds = new Set(selectableFiltered.map((transaction) => transaction.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [selectableFiltered]);

  function toggleSelected(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleBulkAssign(categoryId: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    startTransition(async () => {
      const result = await bulkAssignReviewCategory(ids, categoryId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setLocalCategories((current) => {
        const next = new Map(current);
        for (const id of ids) {
          next.set(id, categoryId);
        }
        return next;
      });
      setConfirmedIds((current) => {
        const next = new Set(current);
        for (const id of ids) {
          next.add(id);
        }
        return next;
      });
      setSelectedIds(new Set());
      toast.success(`Assigned category to ${ids.length} movement${ids.length === 1 ? "" : "s"}`);
    });
  }

  const pendingForFinish = sorted.filter((transaction) => {
    const status = importStatus.get(transaction.id);
    if (status === "auto" || transaction.excluded_from_spending) return false;
    if (status !== "suggested" && status !== "needs_review") return false;
    return !transaction.category_id;
  });

  const canFinish = pendingForFinish.length === 0;
  const reviewedCount = sorted.filter((transaction) =>
    isReviewed(transaction, confirmedIds)
  ).length;
  const progress = transactions.length > 0 ? (reviewedCount / transactions.length) * 100 : 0;
  const monthName = format(parseISO(`${viewMonth}-01`), "MMMM");

  function handleComplete() {
    if (!canFinish) {
      toast.error("Assign a category to every movement before finishing");
      return;
    }

    startTransition(async () => {
      const result = await completeImport(importId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Import completed");
      router.push(`/month/${viewMonth}`);
    });
  }

  function handleCancel() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(`/month/${viewMonth}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[22px] bg-white p-6 shadow-[0_6px_20px_rgba(28,27,41,0.06)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] text-lg text-white">
            ✦
          </div>
          <div>
            <h1 className="text-[26px] font-extrabold">Review import</h1>
            <p className="mt-0.5 text-sm font-semibold text-[#6E6B82]">
              {filename} · {monthLabel}
            </p>
          </div>
        </div>
      </div>

      <GradientHero className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/80">Import review</p>
            <p className="mt-1 text-2xl font-extrabold">
              {reviewedCount} of {transactions.length} reviewed
            </p>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
            {Math.round(progress)}%
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatPill label="automatic" value={stats.auto} dotColor="#6EE7B7" />
          <StatPill label="reviewed" value={stats.suggested} dotColor="#C4B5FD" />
          <StatPill label="needs review" value={stats.needsReview} dotColor="#FDE68A" />
          <StatPill label="to confirm" value={stats.needsHelp} dotColor="#93C5FD" />
        </div>
      </GradientHero>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-[#E7F8F0] px-3 py-1.5 text-[#0F9D58]">
          {stats.auto} organized automatically
        </span>
        <span className="rounded-full bg-[#EDE9FE] px-3 py-1.5 text-[#6C3FD1]">
          <Sparkles className="mr-1 inline h-3 w-3" />
          {stats.suggested} reviewed
        </span>
        {stats.needsReview > 0 && (
          <span className="rounded-full bg-[#FFF7ED] px-3 py-1.5 text-[#B45309]">
            {stats.needsReview} needs review
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-xl font-extrabold">A few things need your help</h2>
          <p className="ml-auto text-[13px] font-bold text-[#6E6B82]">
            {filtered.length} movement{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 gap-0.5 overflow-auto rounded-full bg-[#EDEAF7] p-1">
            {FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                active={filter === option.value}
                label={option.label}
                onClick={() => handleFilterChange(option.value)}
              />
            ))}
          </div>
          {categoryFilterOptions.length > 1 && (
            <FilterDropdown
              label={`${categoryFilterLabel} ▾`}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setSelectedIds(new Set());
              }}
              options={categoryFilterOptions}
            />
          )}
        </div>

        <SurfaceCard className="max-h-[min(420px,60vh)] overflow-y-auto px-5 py-1">
          {selectedIds.size > 0 && (
            <BulkAssignBar
              selectedCount={selectedIds.size}
              categories={categories}
              disabled={isPending}
              onAssign={handleBulkAssign}
              onCancel={() => setSelectedIds(new Set())}
            />
          )}
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-[#6E6B82]">
              No movements in this filter.
            </p>
          ) : (
            filtered.map((transaction) => {
              const readonly = importStatus.get(transaction.id) === "auto";
              const confirmed = isReviewed(transaction, confirmedIds);
              const suggestedByAi = suggestedByAiBucket(transaction, importStatus, categories);
              const needsReview = needsReviewBucket(transaction, importStatus, categories);

              return (
                <ReviewTransactionRow
                  key={`${transaction.id}-${transaction.category_id ?? "none"}`}
                  transaction={transaction}
                  categories={categories}
                  readonly={readonly}
                  confirmed={confirmed}
                  suggestedByAi={suggestedByAi}
                  needsReview={needsReview}
                  selectable={!readonly}
                  selected={selectedIds.has(transaction.id)}
                  onSelectedChange={(selected) => toggleSelected(transaction.id, selected)}
                  onSave={async (id, data) => {
                    const result = await saveReviewTransaction(id, data);
                    if (!result.error) {
                      setLocalCategories((current) => {
                        const next = new Map(current);
                        next.set(id, data.category_id);
                        return next;
                      });
                      setConfirmedIds((current) => new Set(current).add(id));
                    }
                    return result;
                  }}
                />
              );
            })
          )}
        </SurfaceCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <PrimaryButton
          onClick={handleComplete}
          disabled={isPending || !canFinish}
          className="w-full sm:flex-1"
        >
          {isPending
            ? "Finishing..."
            : canFinish
              ? `Finish ${monthName}`
              : `Assign ${pendingForFinish.length} more`}
        </PrimaryButton>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="w-full rounded-[14px] bg-white px-6 py-3 text-sm font-bold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:text-[#1C1B29] disabled:opacity-50 sm:flex-1"
        >
          Cancel
        </button>
      </div>
      {!canFinish && (
        <p className="text-center text-[13px] font-semibold text-[#B45309]">
          Choose a category for every movement before finishing.
        </p>
      )}
    </div>
  );
}
