"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatMoney, formatTransactionAmount } from "@/lib/design/format";
import { guessCategoryFromDescription } from "@/lib/categorization/openai-classify";
import { categoriesForTransactionType } from "@/lib/categories/helpers";
import type { Category, Currency, Transaction, TransactionType } from "@/types/database";
import { cn } from "@/lib/utils";

interface ReviewTransactionRowProps {
  transaction: Transaction;
  categories: Category[];
  readonly?: boolean;
  confirmed?: boolean;
  suggestedByAi?: boolean;
  needsReview?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onSave: (
    id: string,
    data: {
      category_id: string | null;
      transaction_type: TransactionType;
      is_recurring: boolean;
      is_extraordinary: boolean;
      excluded_from_spending: boolean;
    }
  ) => Promise<{ error?: string; success?: boolean }>;
}

function formatReviewAmount(amount: number, currency: Currency) {
  if (currency === "UYU") {
    return formatTransactionAmount(amount, currency);
  }
  return formatMoney(amount);
}

function resolveCategoryId(
  transaction: Transaction,
  categories: Category[],
  needsReview: boolean
) {
  if (needsReview) {
    return transaction.category_id ?? "";
  }

  if (transaction.category_id) {
    const otros = categories.find((category) => category.slug === "otros");
    if (
      transaction.categorization_status === "suggested" &&
      otros &&
      transaction.category_id === otros.id
    ) {
      const guessed = guessCategoryFromDescription(
        transaction.normalized_description,
        categories
      );
      if (guessed) return guessed.id;
    }
    return transaction.category_id;
  }

  if (transaction.categorization_status === "suggested") {
    const guessed = guessCategoryFromDescription(
      transaction.normalized_description,
      categories
    );
    if (guessed) return guessed.id;
  }

  return "";
}

export function ReviewTransactionRow({
  transaction,
  categories,
  readonly = false,
  confirmed = false,
  suggestedByAi = false,
  needsReview = false,
  selectable = false,
  selected = false,
  onSelectedChange,
  onSave,
}: ReviewTransactionRowProps) {
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(() =>
    resolveCategoryId(transaction, categories, needsReview)
  );
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectableCategories = categoriesForTransactionType(
    categories,
    transaction.transaction_type
  );
  const needsCategory = !readonly && !categoryId;

  useEffect(() => {
    setCategoryId(resolveCategoryId(transaction, categories, needsReview));
  }, [categories, needsReview, transaction]);

  function persist(nextCategoryId: string) {
    if (
      !nextCategoryId &&
      transaction.transaction_type === "expense" &&
      !transaction.excluded_from_spending
    ) {
      return;
    }

    const category = categories.find((item) => item.id === nextCategoryId);

    startTransition(async () => {
      const result = await onSave(transaction.id, {
        category_id: nextCategoryId || null,
        transaction_type: transaction.transaction_type,
        is_recurring: transaction.is_recurring,
        is_extraordinary: category
          ? category.group === "extraordinary"
          : transaction.is_extraordinary,
        excluded_from_spending: transaction.excluded_from_spending,
      });

      if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleCategoryChange(value: string | null) {
    const nextValue = value ?? "";
    setCategoryId(nextValue);
    persist(nextValue);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#F1EFF7] py-4 last:border-0",
        confirmed && "bg-[#FAFFFE]",
        selected && "bg-[#F5F3FF]"
      )}
    >
      {selectable ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
          disabled={isPending}
          aria-label={`Select ${transaction.description}`}
          className="size-[18px] rounded-[5px] border-[#C4B5FD] data-checked:border-[#6C3FD1] data-checked:bg-[#6C3FD1]"
        />
      ) : (
        <span className="size-[18px] shrink-0" aria-hidden />
      )}
      <p className="min-w-[120px] flex-1 truncate text-sm font-bold">{transaction.description}</p>
      <p className="shrink-0 text-sm font-extrabold tabular-nums">
        {formatReviewAmount(transaction.amount, transaction.currency)}
      </p>
      {readonly ? (
        <span className="min-w-[160px] rounded-[12px] bg-white/80 px-3 py-2 text-[13px] font-semibold text-[#6E6B82]">
          {selectedCategory?.name ?? "Excluded"}
        </span>
      ) : (
        <Select
          value={categoryId || null}
          onValueChange={handleCategoryChange}
          disabled={isPending}
        >
          <SelectTrigger
            className={cn(
              "h-auto min-w-[160px] rounded-[12px] border-0 px-3 py-2 text-[13px] font-semibold shadow-none",
              needsCategory && "bg-[#FFF7ED] text-[#B45309]",
              suggestedByAi && selectedCategory && "bg-[#EDE9FE] text-[#6C3FD1]",
              !needsCategory && !suggestedByAi && selectedCategory && "bg-white text-[#4B4860]"
            )}
          >
            {selectedCategory ? (
              <span>{selectedCategory.name}</span>
            ) : (
              <span>Choose category</span>
            )}
          </SelectTrigger>
          <SelectContent>
            {selectableCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
