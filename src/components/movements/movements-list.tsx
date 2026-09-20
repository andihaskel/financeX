"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryChip, SurfaceCard } from "@/components/ui/surface";
import { formatTransactionAmount } from "@/lib/design/format";
import { getAccountDisplayName } from "@/lib/accounts/helpers";
import { getCategoryVisual } from "@/lib/design/theme";
import { categoriesForTransactionType } from "@/lib/categories/helpers";
import type {
  Category,
  TransactionType,
  TransactionWithRelations,
} from "@/types/database";
import { cn } from "@/lib/utils";

function groupByDate(transactions: TransactionWithRelations[]) {
  const groups = new Map<string, TransactionWithRelations[]>();
  for (const tx of transactions) {
    const key = tx.transaction_date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

const SPECIAL_TYPES: {
  type: TransactionType;
  label: string;
  emoji: string;
  chipColor: string;
  excluded: boolean;
  needsCategory: boolean;
}[] = [
  {
    type: "expense",
    label: "Expense",
    emoji: "💳",
    chipColor: "#94A3B8",
    excluded: false,
    needsCategory: true,
  },
  {
    type: "credit_card_payment",
    label: "Card payment",
    emoji: "💳",
    chipColor: "#64748B",
    excluded: true,
    needsCategory: false,
  },
  {
    type: "transfer",
    label: "Transfer",
    emoji: "↔",
    chipColor: "#64748B",
    excluded: true,
    needsCategory: false,
  },
  {
    type: "income",
    label: "Income",
    emoji: "↑",
    chipColor: "#10B981",
    excluded: false,
    needsCategory: true,
  },
  {
    type: "refund",
    label: "Refund",
    emoji: "↩",
    chipColor: "#0EA5E9",
    excluded: false,
    needsCategory: true,
  },
];

function displayMeta(tx: TransactionWithRelations, categories: Category[]) {
  const special = SPECIAL_TYPES.find((item) => item.type === tx.transaction_type);
  if (
    tx.transaction_type === "credit_card_payment" ||
    tx.transaction_type === "transfer"
  ) {
    return {
      label: special?.label ?? "Excluded",
      visual: special
        ? { emoji: special.emoji, chipColor: special.chipColor }
        : getCategoryVisual(undefined),
    };
  }

  const category =
    categories.find((item) => item.id === tx.category_id) ?? tx.categories ?? null;

  if (tx.transaction_type === "income") {
    return {
      label: category?.name ?? "Income",
      visual: category
        ? getCategoryVisual(category.slug)
        : special
          ? { emoji: special.emoji, chipColor: special.chipColor }
          : getCategoryVisual(undefined),
    };
  }

  return {
    label: category?.name ?? "Uncategorized",
    visual: getCategoryVisual(category?.slug),
  };
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "muted",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "muted" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors disabled:opacity-50",
        tone === "danger"
          ? "text-[#EF4444] hover:bg-[#FEE2E2]"
          : "text-[#9E9AB0] hover:bg-[#F3F1F9] hover:text-[#1C1B29]"
      )}
    >
      {children}
    </button>
  );
}

function MovementRow({
  tx,
  categories,
  onDeleted,
  onUpdated,
}: {
  tx: TransactionWithRelations;
  categories: Category[];
  onDeleted: (id: string) => void;
  onUpdated: (next: TransactionWithRelations) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editDate, setEditDate] = useState(tx.transaction_date);
  const [editType, setEditType] = useState<TransactionType>(tx.transaction_type);
  const [editCategoryId, setEditCategoryId] = useState(tx.category_id ?? "");
  const [editExtraordinary, setEditExtraordinary] = useState(tx.is_extraordinary);

  const { label, visual } = displayMeta(tx, categories);
  const accountName = tx.accounts ? getAccountDisplayName(tx.accounts) : "Unknown account";
  const typeMeta = SPECIAL_TYPES.find((item) => item.type === editType);
  const needsCategory = typeMeta?.needsCategory ?? false;
  const canBeExtraordinary = editType === "expense" || editType === "refund";

  useEffect(() => {
    if (!editOpen) return;
    setEditDate(tx.transaction_date);
    setEditType(tx.transaction_type);
    setEditCategoryId(tx.category_id ?? "");
    setEditExtraordinary(tx.is_extraordinary);
  }, [editOpen, tx]);

  function handleSave() {
    if (needsCategory && !editCategoryId) {
      toast.error("Select a category");
      return;
    }

    const category = categories.find((item) => item.id === editCategoryId);
    const isExtraordinary = canBeExtraordinary
      ? editExtraordinary || category?.group === "extraordinary"
      : false;

    startTransition(async () => {
      const result = await updateTransaction(tx.id, {
        transaction_date: editDate,
        transaction_type: editType,
        category_id: needsCategory ? editCategoryId || null : null,
        excluded_from_spending: typeMeta?.excluded ?? false,
        is_extraordinary: isExtraordinary,
        categorization_status: "manual",
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const nextCategory = needsCategory
        ? (categories.find((item) => item.id === editCategoryId) ?? null)
        : null;

      onUpdated({
        ...tx,
        transaction_date: editDate,
        transaction_type: editType,
        category_id: needsCategory ? editCategoryId || null : null,
        excluded_from_spending: typeMeta?.excluded ?? false,
        is_extraordinary: isExtraordinary,
        categorization_status: "manual",
        categories: nextCategory
          ? {
              id: nextCategory.id,
              name: nextCategory.name,
              slug: nextCategory.slug,
              group: nextCategory.group,
            }
          : null,
      });
      setEditOpen(false);
      toast.success("Movement updated");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTransaction(tx.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      onDeleted(tx.id);
      toast.success("Movement deleted");
    });
  }

  return (
    <div className="flex items-center gap-3.5 border-b border-[#F1EFF7] py-4 last:border-0">
      <CategoryChip emoji={visual.emoji} color={visual.chipColor} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{tx.description}</p>
        <p className="mt-1 truncate text-xs font-semibold text-[#6E6B82]">
          {format(parseISO(tx.transaction_date), "MMM d")} · {label} · {accountName}
        </p>
      </div>
      <p className="shrink-0 text-[15px] font-extrabold">
        {formatTransactionAmount(tx.amount, tx.currency)}
      </p>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label="Edit movement" onClick={() => setEditOpen(true)} disabled={isPending}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton
          label="Delete movement"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          tone="danger"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">Edit movement</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              {tx.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#6E6B82]">
                Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
              />
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#6E6B82]">Type</p>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_TYPES.map((option) => {
                  const active = editType === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => {
                        setEditType(option.type);
                        const nextCategories = categoriesForTransactionType(
                          categories,
                          option.type
                        );
                        if (
                          nextCategories.length > 0 &&
                          !nextCategories.some((category) => category.id === editCategoryId)
                        ) {
                          setEditCategoryId(nextCategories[0].id);
                        }
                        if (option.type !== "expense" && option.type !== "refund") {
                          setEditExtraordinary(false);
                        }
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                        active
                          ? "bg-[#6C3FD1] text-white"
                          : "bg-[#F3F1F9] text-[#1C1B29]"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {needsCategory && (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#6E6B82]">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categoriesForTransactionType(categories, editType).map((category) => {
                    const catVisual = getCategoryVisual(category.slug);
                    const active = editCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setEditCategoryId(category.id);
                          if (category.group === "extraordinary") {
                            setEditExtraordinary(true);
                          }
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                          active ? "text-white" : "bg-[#F3F1F9] text-[#1C1B29]"
                        )}
                        style={active ? { backgroundColor: catVisual.chipColor } : undefined}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-[#E2DEF0] bg-[#FAF9FC] px-3.5 py-3">
              <Checkbox
                checked={editExtraordinary}
                onCheckedChange={(checked) => setEditExtraordinary(checked === true)}
                disabled={isPending || !canBeExtraordinary}
                className="size-[18px] rounded-[5px] border-[#C4B5FD] data-checked:border-[#6C3FD1] data-checked:bg-[#6C3FD1]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#1C1B29]">Extraordinary</span>
                <span className="block text-xs font-semibold text-[#6E6B82]">
                  {canBeExtraordinary
                    ? "Counts as one-off / travel-style spending"
                    : "Only for expenses and refunds"}
                </span>
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={isPending}
              className="rounded-[14px] px-4 py-2.5 text-sm font-bold text-[#6E6B82]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (needsCategory && !editCategoryId) || !editDate}
              className="rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">Delete movement?</DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              This will permanently remove “{tx.description}”.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
              className="rounded-[14px] px-4 py-2.5 text-sm font-bold text-[#6E6B82]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-[14px] bg-[#EF4444] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MovementsList({
  transactions,
  categories,
}: {
  transactions: TransactionWithRelations[];
  categories: Category[];
}) {
  const [items, setItems] = useState(transactions);

  useEffect(() => {
    setItems(transactions);
  }, [transactions]);

  const groups = groupByDate(items);

  return (
    <div className="space-y-5">
      {groups.map(([date, rows]) => (
        <div key={date}>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9E9AB0]">
            {format(parseISO(date), "EEEE, MMM d")}
          </p>
          <SurfaceCard className="px-5 py-1">
            {rows.map((tx) => (
              <MovementRow
                key={tx.id}
                tx={tx}
                categories={categories}
                onDeleted={(id) =>
                  setItems((current) => current.filter((item) => item.id !== id))
                }
                onUpdated={(next) =>
                  setItems((current) =>
                    current.map((item) => (item.id === next.id ? next : item))
                  )
                }
              />
            ))}
          </SurfaceCard>
        </div>
      ))}
    </div>
  );
}
