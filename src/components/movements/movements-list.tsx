"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createManualTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/app/actions/transactions";
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

function MovementFormFields({
  editDate,
  setEditDate,
  editType,
  setEditType,
  editCategoryId,
  setEditCategoryId,
  editExtraordinary,
  setEditExtraordinary,
  categories,
  isPending,
  showDescriptionAmount,
  editDescription,
  setEditDescription,
  editAmount,
  setEditAmount,
  currency,
  accountName,
}: {
  editDate: string;
  setEditDate: (value: string) => void;
  editType: TransactionType;
  setEditType: (value: TransactionType) => void;
  editCategoryId: string;
  setEditCategoryId: (value: string) => void;
  editExtraordinary: boolean;
  setEditExtraordinary: (value: boolean) => void;
  categories: Category[];
  isPending: boolean;
  showDescriptionAmount?: boolean;
  editDescription?: string;
  setEditDescription?: (value: string) => void;
  editAmount?: string;
  setEditAmount?: (value: string) => void;
  currency?: "USD" | "UYU";
  accountName?: string;
}) {
  const typeMeta = SPECIAL_TYPES.find((item) => item.type === editType);
  const needsCategory = typeMeta?.needsCategory ?? false;
  const canBeExtraordinary = editType === "expense" || editType === "refund";

  return (
    <div className="space-y-4 py-1">
      {showDescriptionAmount && setEditDescription && setEditAmount && (
        <>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#6E6B82]">
              Description
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#6E6B82]">
              Amount
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                inputMode="decimal"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="min-w-0 flex-1 rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
              />
              {currency && (
                <span className="shrink-0 rounded-[13px] bg-[#F3F1F9] px-3 py-3 text-sm font-bold text-[#6E6B82]">
                  {currency}
                </span>
              )}
            </div>
          </div>
          {accountName && (
            <p className="text-[13px] font-semibold text-[#6E6B82]">
              Account: {accountName}
            </p>
          )}
        </>
      )}

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<"edit" | "duplicate" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editDate, setEditDate] = useState(tx.transaction_date);
  const [editDescription, setEditDescription] = useState(tx.description);
  const [editAmount, setEditAmount] = useState(String(Math.abs(tx.amount)));
  const [editType, setEditType] = useState<TransactionType>(tx.transaction_type);
  const [editCategoryId, setEditCategoryId] = useState(tx.category_id ?? "");
  const [editExtraordinary, setEditExtraordinary] = useState(tx.is_extraordinary);

  const { label, visual } = displayMeta(tx, categories);
  const accountName = tx.accounts ? getAccountDisplayName(tx.accounts) : "Unknown account";
  const typeMeta = SPECIAL_TYPES.find((item) => item.type === editType);
  const needsCategory = typeMeta?.needsCategory ?? false;
  const canBeExtraordinary = editType === "expense" || editType === "refund";
  const modalOpen = modalMode !== null;

  function resetFormFromTx() {
    setEditDate(tx.transaction_date);
    setEditDescription(tx.description);
    setEditAmount(String(Math.abs(tx.amount)));
    setEditType(tx.transaction_type);
    setEditCategoryId(tx.category_id ?? "");
    setEditExtraordinary(tx.is_extraordinary);
  }

  useEffect(() => {
    if (!modalOpen) return;
    resetFormFromTx();
  }, [modalOpen, tx]);

  function closeModal() {
    setModalMode(null);
  }

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
      closeModal();
      toast.success("Movement updated");
    });
  }

  function handleDuplicate() {
    if (needsCategory && !editCategoryId) {
      toast.error("Select a category");
      return;
    }

    const amount = Number(editAmount.replace(/,/g, ""));
    if (!editDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const category = categories.find((item) => item.id === editCategoryId);
    const isExtraordinary =
      editType === "expense" || editType === "refund"
        ? editExtraordinary || category?.group === "extraordinary"
        : false;

    startTransition(async () => {
      const result = await createManualTransaction({
        month: editDate.slice(0, 7),
        description: editDescription,
        amount,
        accountId: tx.account_id,
        categoryId: needsCategory ? editCategoryId || null : null,
        transactionType: editType,
        transactionDate: editDate,
        currency: tx.currency,
        isExtraordinary,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      closeModal();
      router.refresh();
      toast.success("Movement duplicated");
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

  const duplicateAmountValid = Number(editAmount.replace(/,/g, "")) !== 0;

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
        <IconButton
          label="Edit movement"
          onClick={() => setModalMode("edit")}
          disabled={isPending}
        >
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

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          {modalMode === "duplicate" && (
            <button
              type="button"
              onClick={() => setModalMode("edit")}
              className="mb-1 text-left text-[13px] font-semibold text-[#6E6B82]"
            >
              ← Back to edit
            </button>
          )}

          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">
              {modalMode === "duplicate" ? "Duplicate movement" : "Edit movement"}
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              {modalMode === "duplicate"
                ? "Create a copy with the details below. Change the date or amount if it already exists."
                : tx.description}
            </DialogDescription>
          </DialogHeader>

          <MovementFormFields
            editDate={editDate}
            setEditDate={setEditDate}
            editType={editType}
            setEditType={setEditType}
            editCategoryId={editCategoryId}
            setEditCategoryId={setEditCategoryId}
            editExtraordinary={editExtraordinary}
            setEditExtraordinary={setEditExtraordinary}
            categories={categories}
            isPending={isPending}
            showDescriptionAmount={modalMode === "duplicate"}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editAmount={editAmount}
            setEditAmount={setEditAmount}
            currency={tx.currency}
            accountName={accountName}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isPending}
              className="rounded-[14px] px-4 py-2.5 text-sm font-bold text-[#6E6B82]"
            >
              Cancel
            </button>
            {modalMode === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={() => setModalMode("duplicate")}
                  disabled={isPending}
                  className="rounded-[14px] px-4 py-2.5 text-sm font-bold text-[#6C3FD1]"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || (needsCategory && !editCategoryId) || !editDate}
                  className="rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={
                  isPending ||
                  (needsCategory && !editCategoryId) ||
                  !editDate ||
                  !editDescription.trim() ||
                  !duplicateAmountValid
                }
                className="rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create copy"}
              </button>
            )}
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
  groupByDate: shouldGroupByDate = true,
}: {
  transactions: TransactionWithRelations[];
  categories: Category[];
  groupByDate?: boolean;
}) {
  const [items, setItems] = useState(transactions);

  useEffect(() => {
    setItems(transactions);
  }, [transactions]);

  function renderRow(tx: TransactionWithRelations) {
    return (
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
    );
  }

  if (!shouldGroupByDate) {
    return <SurfaceCard className="px-5 py-1">{items.map(renderRow)}</SurfaceCard>;
  }

  const groups = groupByDate(items);

  return (
    <div className="space-y-5">
      {groups.map(([date, rows]) => (
        <div key={date}>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9E9AB0]">
            {format(parseISO(date), "EEEE, MMM d")}
          </p>
          <SurfaceCard className="px-5 py-1">{rows.map(renderRow)}</SurfaceCard>
        </div>
      ))}
    </div>
  );
}
