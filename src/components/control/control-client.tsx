"use client";

import Link from "next/link";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  clearOccurrenceMatch,
  confirmOccurrenceMatch,
  copyCommitmentsFromPreviousMonth,
  createCommitment,
  deleteCommitment,
  reconcileMonth,
  removeCommitmentFromMonth,
  toggleCommitmentOccurrence,
  updateCommitment,
  type ReconcileSuggestion,
} from "@/app/actions/control";
import { MonthHeroNav } from "@/components/shared/month-title-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SurfaceCard } from "@/components/ui/surface";
import {
  nextAnnualDueLabel,
  isCommitmentActiveInMonth,
} from "@/lib/control/defaults";
import {
  displayAmountForOccurrence,
  formatControlAmount,
  formatPeriodAmounts,
  getDueUrgency,
  isOccurrenceDone,
  summarizeRemaining,
  visualStatusForRow,
  type ControlRowStatusVisual,
} from "@/lib/control/logic";
import { cn } from "@/lib/utils";
import type {
  Commitment,
  CommitmentAmountType,
  CommitmentDirection,
  CommitmentOccurrence,
  CommitmentRecurrenceType,
  Currency,
  Transaction,
} from "@/types/database";

type ControlRow = {
  occurrence: CommitmentOccurrence;
  commitment: Commitment;
};

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
          : "text-[#1C1B29] hover:bg-[#F3F1F9]"
      )}
    >
      {children}
    </button>
  );
}

function CommitmentFormFields({
  name,
  setName,
  direction,
  setDirection,
  amount,
  setAmount,
  currency,
  setCurrency,
  amountType,
  setAmountType,
  recurrence,
  setRecurrence,
  dueDay,
  setDueDay,
  matchHint,
  setMatchHint,
}: {
  name: string;
  setName: (v: string) => void;
  direction: CommitmentDirection;
  setDirection: (v: CommitmentDirection) => void;
  amount: string;
  setAmount: (v: string) => void;
  currency: Currency;
  setCurrency: (v: Currency) => void;
  amountType: CommitmentAmountType;
  setAmountType: (v: CommitmentAmountType) => void;
  recurrence: CommitmentRecurrenceType;
  setRecurrence: (v: CommitmentRecurrenceType) => void;
  dueDay: string;
  setDueDay: (v: string) => void;
  matchHint: string;
  setMatchHint: (v: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Apartment rent)"
        className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
      />
      <div className="grid grid-cols-2 gap-2">
        {(["pay", "receive"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setDirection(value);
              setCurrency(value === "receive" ? "USD" : "UYU");
            }}
            className={cn(
              "rounded-[12px] px-3 py-2.5 text-[13px] font-bold capitalize",
              direction === value
                ? "bg-[#6C3FD1] text-white"
                : "bg-[#F3F1F9] text-[#1C1B29]"
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="flex gap-2.5">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={amountType === "variable" ? "Optional" : "Amount"}
          disabled={amountType === "variable"}
          className="min-w-0 flex-1 rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1] disabled:bg-[#F3F1F9]"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="w-[100px] shrink-0 rounded-[13px] border border-[#E2DEF0] px-3 py-3 text-sm font-semibold outline-none"
        >
          <option value="UYU">UYU</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["fixed", "Fixed amount"],
            ["variable", "Variable"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setAmountType(value)}
            className={cn(
              "rounded-[12px] px-3 py-2.5 text-[13px] font-bold",
              amountType === value
                ? "bg-[#6C3FD1] text-white"
                : "bg-[#F3F1F9] text-[#1C1B29]"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <select
        value={recurrence}
        onChange={(e) => setRecurrence(e.target.value as CommitmentRecurrenceType)}
        className="w-full rounded-[13px] bg-[#F3F1F9] px-3.5 py-3 text-sm font-semibold outline-none"
      >
        <option value="monthly">Repeats monthly</option>
        <option value="annual">Repeats annually</option>
        <option value="one_time">One-time</option>
        <option value="custom">Custom months</option>
      </select>
      <input
        value={dueDay}
        onChange={(e) => setDueDay(e.target.value)}
        placeholder="Due day (optional, 1–31)"
        className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
      />
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-[#6E6B82]">
          How should we recognize this payment?
        </p>
        <input
          value={matchHint}
          onChange={(e) => setMatchHint(e.target.value)}
          placeholder="e.g. movements from Rocío Velasco"
          className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
        />
      </div>
    </div>
  );
}

function StatusDot({
  visual,
  onClick,
  disabled,
}: {
  visual: ControlRowStatusVisual;
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles: Record<
    ControlRowStatusVisual,
    { className: string; content: string }
  > = {
    pending: {
      className: "border-[1.5px] border-[#D8D4E8] bg-white text-transparent",
      content: "",
    },
    completed: {
      className: "border-0 bg-transparent text-[#10B981]",
      content: "✓",
    },
    reconciled: {
      className: "border-0 bg-[#EAF7F0] text-[#0F9D58]",
      content: "✓",
    },
  };

  const style = styles[visual];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={visual === "pending" ? "Mark as done" : "Mark as pending"}
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold transition-opacity disabled:opacity-50",
        style.className
      )}
    >
      {style.content}
    </button>
  );
}

function CommitmentRow({
  row,
  year,
  month,
  monthKey,
  matchedLabel,
  expanded,
  onToggleExpand,
  monthTransactions,
}: {
  row: ControlRow;
  year: number;
  month: number;
  monthKey: string;
  matchedLabel: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  monthTransactions: Transaction[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPermanentOpen, setConfirmPermanentOpen] = useState(false);
  const [movementQuery, setMovementQuery] = useState("");

  const [name, setName] = useState(row.commitment.name);
  const [direction, setDirection] = useState<CommitmentDirection>(
    row.commitment.direction
  );
  const [amount, setAmount] = useState(
    row.commitment.amount != null ? String(row.commitment.amount) : ""
  );
  const [currency, setCurrency] = useState<Currency>(row.commitment.currency);
  const [amountType, setAmountType] = useState<CommitmentAmountType>(
    row.commitment.amount_type
  );
  const [recurrence, setRecurrence] = useState<CommitmentRecurrenceType>(
    row.commitment.recurrence_type
  );
  const [dueDay, setDueDay] = useState(
    row.commitment.due_day != null ? String(row.commitment.due_day) : ""
  );
  const [matchHint, setMatchHint] = useState(row.commitment.match_hint ?? "");

  const due = getDueUrgency(row.commitment.due_day, year, month);
  const done = isOccurrenceDone(row.occurrence.status);
  const visual = visualStatusForRow({
    status: row.occurrence.status,
    dueUrgency: due.urgency,
  });
  const displayAmount = displayAmountForOccurrence(row.commitment, row.occurrence);
  const amountLabel = formatControlAmount(
    displayAmount,
    row.commitment.currency,
    row.commitment.amount_type
  );

  const dueColor =
    !done && due.urgency === "overdue"
      ? "text-[#EF4444]"
      : !done && due.urgency === "soon"
        ? "text-[#B45309]"
        : "text-[#1C1B29]";

  const linkedTx = row.occurrence.reconciled_transaction_id
    ? monthTransactions.find((tx) => tx.id === row.occurrence.reconciled_transaction_id)
    : null;

  const filteredMovements = (() => {
    const q = movementQuery.trim().toLowerCase();
    const list = monthTransactions
      .slice()
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

    const scored = list.map((tx) => {
      let rank = 0;
      if (tx.currency === row.commitment.currency) rank += 2;
      if (row.commitment.direction === "pay" && tx.amount < 0) rank += 2;
      if (row.commitment.direction === "receive" && tx.amount > 0) rank += 2;
      if (
        displayAmount != null &&
        Math.abs(Math.abs(tx.amount) - Number(displayAmount)) <= 1
      ) {
        rank += 3;
      }
      return { tx, rank };
    });

    const filtered = q
      ? scored.filter(({ tx }) => {
          const hay = `${tx.description} ${tx.normalized_description} ${Math.abs(tx.amount)} ${tx.transaction_date}`.toLowerCase();
          return hay.includes(q);
        })
      : scored;

    return filtered
      .sort((a, b) => b.rank - a.rank || b.tx.transaction_date.localeCompare(a.tx.transaction_date))
      .map(({ tx }) => tx)
      .slice(0, 40);
  })();

  useEffect(() => {
    if (!editOpen) return;
    setName(row.commitment.name);
    setDirection(row.commitment.direction);
    setAmount(row.commitment.amount != null ? String(row.commitment.amount) : "");
    setCurrency(row.commitment.currency);
    setAmountType(row.commitment.amount_type);
    setRecurrence(row.commitment.recurrence_type);
    setDueDay(row.commitment.due_day != null ? String(row.commitment.due_day) : "");
    setMatchHint(row.commitment.match_hint ?? "");
    setMovementQuery("");
  }, [editOpen, row.commitment]);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCommitmentOccurrence(row.occurrence.id, monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveEdit() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const parsedAmount =
      amountType === "variable" || amount.trim() === ""
        ? null
        : Number(amount.replace(/,/g, ""));
    if (amountType === "fixed" && (parsedAmount == null || !Number.isFinite(parsedAmount))) {
      toast.error("Amount is required for fixed commitments");
      return;
    }

    startTransition(async () => {
      const result = await updateCommitment({
        id: row.commitment.id,
        name,
        direction,
        amount: parsedAmount,
        currency,
        amount_type: amountType,
        recurrence_type: recurrence,
        due_day: dueDay ? Number(dueDay) : null,
        due_month:
          recurrence === "annual"
            ? (row.commitment.due_month ?? Number(monthKey.slice(5, 7)))
            : null,
        match_hint: matchHint || null,
        monthKey,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEditOpen(false);
      toast.success("Commitment updated");
      router.refresh();
    });
  }

  function handleRemoveFromMonth() {
    startTransition(async () => {
      const result = await removeCommitmentFromMonth(row.occurrence.id, monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      toast.success("Removed from this month");
      router.refresh();
    });
  }

  function handleDeletePermanently() {
    startTransition(async () => {
      const result = await deleteCommitment(row.commitment.id, monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirmPermanentOpen(false);
      setEditOpen(false);
      toast.success("Commitment deleted");
      router.refresh();
    });
  }

  function handleLinkMovement(transactionId: string) {
    startTransition(async () => {
      const result = await confirmOccurrenceMatch({
        occurrenceId: row.occurrence.id,
        transactionId,
        monthKey,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Reconciled with movement");
      router.refresh();
    });
  }

  function handleUnlinkMovement() {
    startTransition(async () => {
      const result = await clearOccurrenceMatch(row.occurrence.id, monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Unlinked movement");
      router.refresh();
    });
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-[#F1EFF7] py-[7px]",
          !matchedLabel && "last:border-0"
        )}
      >
        <StatusDot visual={visual} onClick={handleToggle} disabled={isPending} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={matchedLabel ? onToggleExpand : undefined}
          disabled={!matchedLabel}
        >
          <p className="truncate text-[13.5px] font-bold text-[#1C1B29]">
            {row.commitment.name}
            {row.occurrence.status === "reconciled" ? (
              <span className="ml-1.5 text-[11px] font-semibold text-[#0F9D58]">
                reconciled
              </span>
            ) : null}
          </p>
        </button>
        <p className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[#1C1B29]">
          {amountLabel}
        </p>
        <p
          className={cn(
            "w-[72px] shrink-0 whitespace-nowrap text-right text-[13px] font-bold",
            dueColor
          )}
        >
          {due.label}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label="Edit commitment"
            onClick={() => setEditOpen(true)}
            disabled={isPending}
          >
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            label="Remove from this month"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
            tone="danger"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
      {expanded && matchedLabel && (
        <div className="mb-2 rounded-[12px] bg-[#F9F8FC] px-3.5 py-2 text-xs font-bold text-[#4B4860]">
          {matchedLabel}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[26px] border-[#F1EFF7] p-0 sm:max-w-md">
          <div className="shrink-0 border-b border-[#F1EFF7] px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-extrabold text-[#1C1B29]">
                Edit commitment
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
                Changes apply to this commitment going forward
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <CommitmentFormFields
              name={name}
              setName={setName}
              direction={direction}
              setDirection={setDirection}
              amount={amount}
              setAmount={setAmount}
              currency={currency}
              setCurrency={setCurrency}
              amountType={amountType}
              setAmountType={setAmountType}
              recurrence={recurrence}
              setRecurrence={setRecurrence}
              dueDay={dueDay}
              setDueDay={setDueDay}
              matchHint={matchHint}
              setMatchHint={setMatchHint}
            />

            <div className="border-t border-[#F1EFF7] pt-5">
              <p className="mb-1.5 text-[13px] font-extrabold text-[#1C1B29]">
                Reconcile manually
              </p>
              <p className="mb-3 text-xs font-semibold text-[#6E6B82]">
                Search this month’s movements and link one
              </p>

              {linkedTx ? (
                <div className="mb-3 rounded-[14px] border border-[#EAF7F0] bg-[#EAF7F0]/70 px-3.5 py-3">
                  <p className="text-[13px] font-bold text-[#0F9D58]">Linked movement</p>
                  <p className="mt-1 text-xs font-semibold text-[#4B4860]">
                    {format(parseISO(linkedTx.transaction_date), "MMM d")} ·{" "}
                    {linkedTx.description} ·{" "}
                    {formatControlAmount(
                      Math.abs(linkedTx.amount),
                      linkedTx.currency,
                      "fixed"
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleUnlinkMovement}
                    disabled={isPending}
                    className="mt-2 text-[13px] font-bold text-[#EF4444] disabled:opacity-50"
                  >
                    Unlink
                  </button>
                </div>
              ) : null}

              <input
                value={movementQuery}
                onChange={(e) => setMovementQuery(e.target.value)}
                placeholder="Search by description or amount…"
                className="mb-2.5 w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
              />

              {monthTransactions.length === 0 ? (
                <p className="py-3 text-center text-xs font-semibold text-[#6E6B82]">
                  No movements in this month yet
                </p>
              ) : filteredMovements.length === 0 ? (
                <p className="py-3 text-center text-xs font-semibold text-[#6E6B82]">
                  No movements match that search
                </p>
              ) : (
                <div className="max-h-[200px] space-y-1.5 overflow-y-auto rounded-[14px] border border-[#F1EFF7] p-1.5">
                  {filteredMovements.map((tx) => {
                    const selected =
                      tx.id === row.occurrence.reconciled_transaction_id;
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleLinkMovement(tx.id)}
                        className={cn(
                          "flex w-full flex-col rounded-[12px] px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                          selected ? "bg-[#EAF7F0]" : "hover:bg-[#F9F8FC]"
                        )}
                      >
                        <span className="truncate text-[13px] font-bold">
                          {tx.description}
                        </span>
                        <span className="mt-0.5 text-[11px] font-semibold text-[#6E6B82]">
                          {format(parseISO(tx.transaction_date), "MMM d")} ·{" "}
                          {formatControlAmount(
                            Math.abs(tx.amount),
                            tx.currency,
                            "fixed"
                          )}
                          {selected ? " · linked" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-[#F1EFF7] px-6 py-4">
            <div className="flex gap-2">
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
                onClick={handleSaveEdit}
                disabled={isPending || !name.trim()}
                className="flex-1 rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setConfirmPermanentOpen(true)}
              disabled={isPending}
              className="w-full text-center text-sm font-bold text-[#EF4444] disabled:opacity-50"
            >
              Delete permanently from all months
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">
              Remove from this month?
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              “{row.commitment.name}” will leave this month’s checklist. Other months stay
              unchanged — you can copy it back later.
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
              onClick={handleRemoveFromMonth}
              disabled={isPending}
              className="rounded-[14px] bg-[#EF4444] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Removing..." : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmPermanentOpen} onOpenChange={setConfirmPermanentOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">
              Delete permanently?
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              This removes “{row.commitment.name}” from every month. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmPermanentOpen(false)}
              disabled={isPending}
              className="rounded-[14px] px-4 py-2.5 text-sm font-bold text-[#6E6B82]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeletePermanently}
              disabled={isPending}
              className="rounded-[14px] bg-[#EF4444] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Deleting..." : "Delete forever"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommitmentSection({
  title,
  subtitle,
  rows,
  year,
  month,
  monthKey,
  txById,
  monthTransactions,
  expandedId,
  onToggleExpand,
}: {
  title: string;
  subtitle: string;
  rows: ControlRow[];
  year: number;
  month: number;
  monthKey: string;
  txById: Map<string, Transaction>;
  monthTransactions: Transaction[];
  expandedId: string | null;
  onToggleExpand: (occurrenceId: string) => void;
}) {
  return (
    <SurfaceCard className="!px-5 !py-1">
      <div className="flex items-baseline justify-between border-b border-[#F1EFF7] py-[9px]">
        <p className="text-[13px] font-extrabold text-[#1C1B29]">{title}</p>
        <p className="text-xs font-bold text-[#1C1B29]">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-[#1C1B29]">
          Nothing here.
        </p>
      ) : (
        rows.map((row) => {
          const tx = row.occurrence.reconciled_transaction_id
            ? txById.get(row.occurrence.reconciled_transaction_id)
            : null;
          const matchedLabel = tx
            ? `${format(parseISO(tx.transaction_date), "MMM d")} · ${tx.description} · ${formatControlAmount(
                Math.abs(tx.amount),
                tx.currency,
                "fixed"
              )}`
            : null;
          return (
            <CommitmentRow
              key={row.occurrence.id}
              row={row}
              year={year}
              month={month}
              monthKey={monthKey}
              matchedLabel={matchedLabel}
              expanded={expandedId === row.occurrence.id}
              onToggleExpand={() => onToggleExpand(row.occurrence.id)}
              monthTransactions={monthTransactions}
            />
          );
        })
      )}
    </SurfaceCard>
  );
}

function AddCommitmentDialog({
  open,
  onOpenChange,
  monthKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<CommitmentDirection>("pay");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UYU");
  const [amountType, setAmountType] = useState<CommitmentAmountType>("fixed");
  const [recurrence, setRecurrence] =
    useState<CommitmentRecurrenceType>("monthly");
  const [dueDay, setDueDay] = useState("");
  const [matchHint, setMatchHint] = useState("");

  function reset() {
    setName("");
    setDirection("pay");
    setAmount("");
    setCurrency("UYU");
    setAmountType("fixed");
    setRecurrence("monthly");
    setDueDay("");
    setMatchHint("");
  }

  function handleSave() {
    startTransition(async () => {
      const parsedAmount =
        amountType === "variable" || amount.trim() === ""
          ? null
          : Number(amount.replace(/,/g, ""));
      const result = await createCommitment({
        name,
        direction,
        amount: parsedAmount,
        currency,
        amount_type: amountType,
        recurrence_type: recurrence,
        due_day: dueDay ? Number(dueDay) : null,
        due_month: recurrence === "annual" ? Number(monthKey.slice(5, 7)) : null,
        match_hint: matchHint || null,
        monthKey,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Commitment added");
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">Add commitment</DialogTitle>
        </DialogHeader>
        <CommitmentFormFields
          name={name}
          setName={setName}
          direction={direction}
          setDirection={setDirection}
          amount={amount}
          setAmount={setAmount}
          currency={currency}
          setCurrency={setCurrency}
          amountType={amountType}
          setAmountType={setAmountType}
          recurrence={recurrence}
          setRecurrence={setRecurrence}
          dueDay={dueDay}
          setDueDay={setDueDay}
          matchHint={matchHint}
          setMatchHint={setMatchHint}
        />
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isPending ||
              !name.trim() ||
              (amountType === "fixed" && !amount.trim())
            }
            className="w-full rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save commitment"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm font-semibold text-[#6E6B82]"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ControlClient({
  monthKey,
  year,
  month,
  commitments,
  occurrences,
  transactions,
  previousMonthWithOccurrences,
  hasApplicableCommitments,
}: {
  monthKey: string;
  year: number;
  month: number;
  commitments: Commitment[];
  occurrences: CommitmentOccurrence[];
  transactions: Transaction[];
  previousMonthWithOccurrences: { year: number; month: number } | null;
  hasApplicableCommitments: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isReconciling, startReconcile] = useTransition();
  const [isCopying, startCopy] = useTransition();
  const [suggestions, setSuggestions] = useState<ReconcileSuggestion[]>([]);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [autoLinked, setAutoLinked] = useState<string[]>([]);

  const occurrenceByCommitment = new Map(
    occurrences.map((o) => [o.commitment_id, o])
  );
  const txById = new Map(transactions.map((tx) => [tx.id, tx]));

  const applicable = commitments.filter((c) =>
    isCommitmentActiveInMonth(c, year, month)
  );
  const upcoming = commitments.filter(
    (c) => c.active && !isCommitmentActiveInMonth(c, year, month)
  );

  const rows: ControlRow[] = applicable
    .map((commitment) => {
      const occurrence = occurrenceByCommitment.get(commitment.id);
      if (!occurrence) return null;
      return { commitment, occurrence };
    })
    .filter((row): row is ControlRow => row != null);

  const sortRows = (list: ControlRow[]) =>
    list.slice().sort((a, b) => {
      const rank = (status: ControlRow["occurrence"]["status"]) => {
        if (status === "reconciled") return 2;
        if (status === "completed" || status === "skipped") return 1;
        return 0; // pending
      };
      const aRank = rank(a.occurrence.status);
      const bRank = rank(b.occurrence.status);
      if (aRank !== bRank) return aRank - bRank;
      return a.commitment.sort_order - b.commitment.sort_order;
    });

  const payRows = sortRows(rows.filter((r) => r.commitment.direction === "pay"));
  const receiveRows = sortRows(
    rows.filter((r) => r.commitment.direction === "receive")
  );

  const summaryRows = rows.map((r) => ({
    direction: r.commitment.direction,
    currency: r.commitment.currency,
    amount: displayAmountForOccurrence(r.commitment, r.occurrence),
    amountType: r.commitment.amount_type,
    done: isOccurrenceDone(r.occurrence.status),
  }));
  const summary = summarizeRemaining(summaryRows);

  const payPending = payRows.filter((r) => !isOccurrenceDone(r.occurrence.status));
  const receivePending = receiveRows.filter(
    (r) => !isOccurrenceDone(r.occurrence.status)
  );
  const payDone = payRows.length - payPending.length;
  const receiveDone = receiveRows.length - receivePending.length;

  const payRemainingLabel = formatPeriodAmounts(summary.payByCurrency, "pay")
    .replace(" to pay", "")
    .trim();
  const receiveRemainingLabel = formatPeriodAmounts(
    summary.receiveByCurrency,
    "receive"
  )
    .replace(" to receive", "")
    .trim();

  const soonCount = payPending.filter((r) => {
    const due = getDueUrgency(r.commitment.due_day, year, month);
    return due.urgency === "soon";
  }).length;
  const overdueCount = payPending.filter((r) => {
    const due = getDueUrgency(r.commitment.due_day, year, month);
    return due.urgency === "overdue";
  }).length;

  const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM yyyy");
  const prev = format(subMonths(parseISO(`${monthKey}-01`), 1), "yyyy-MM");
  const next = format(addMonths(parseISO(`${monthKey}-01`), 1), "yyyy-MM");
  const reconciledCount = rows.filter((r) => r.occurrence.status === "reconciled").length;
  const allReconciled =
    rows.length > 0 &&
    rows.every(
      (r) =>
        r.occurrence.status === "reconciled" ||
        !isOccurrenceDone(r.occurrence.status)
    ) &&
    rows.some((r) => isOccurrenceDone(r.occurrence.status)) &&
    rows
      .filter((r) => isOccurrenceDone(r.occurrence.status))
      .every((r) => r.occurrence.status === "reconciled");

  function handleReconcile() {
    startReconcile(async () => {
      const result = await reconcileMonth(monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAutoLinked(result.autoLinked ?? []);
      setSuggestions(result.suggestions ?? []);
      setReconcileOpen(true);
      router.refresh();
      if ((result.autoLinked?.length ?? 0) > 0) {
        toast.success(
          `Reconciled ${result.autoLinked!.length} commitment${
            result.autoLinked!.length === 1 ? "" : "s"
          }`
        );
      } else if ((result.suggestions?.length ?? 0) === 0) {
        toast.message("No high-confidence matches found");
      }
    });
  }

  function handleCopyFromPrevious() {
    startCopy(async () => {
      const result = await copyCommitmentsFromPreviousMonth(monthKey);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        previousMonthWithOccurrences
          ? `Copied ${result.count} commitments (unchecked)`
          : `Set up ${result.count} commitments for this month`
      );
      router.refresh();
    });
  }

  const monthIsEmpty = occurrences.length === 0;
  const copyLabel = previousMonthWithOccurrences
    ? "Copy from last month"
    : "Set up this month";
  const canCopy = Boolean(previousMonthWithOccurrences) || hasApplicableCommitments;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3.5 whitespace-nowrap">
        <div className="flex items-center gap-3.5">
          <Link href={`/control?month=${prev}`} className="text-base text-[#6E6B82]">
            ‹
          </Link>
          <MonthHeroNav
            month={monthKey}
            navigateTo={(m) => `/control?month=${m}`}
          />
          <Link href={`/control?month=${next}`} className="text-base text-[#6E6B82]">
            ›
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="ml-auto rounded-[13px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-[18px] py-[11px] text-[13px] font-bold text-white"
        >
          + Commitment
        </button>
        {!monthIsEmpty && (
          <button
            type="button"
            onClick={handleReconcile}
            disabled={isReconciling}
            className={cn(
              "rounded-[13px] border-[1.5px] px-[18px] py-[11px] text-[13px] font-bold disabled:opacity-60",
              allReconciled && reconciledCount > 0
                ? "border-[#EAF7F0] bg-[#EAF7F0] text-[#0F9D58]"
                : "border-[#6C3FD1] bg-white text-[#6C3FD1]"
            )}
          >
            {isReconciling
              ? "Reconciling..."
              : allReconciled && reconciledCount > 0
                ? "✓ Reconciled"
                : "Reconcile movements"}
          </button>
        )}
      </div>

      {monthIsEmpty ? (
        <SurfaceCard className="px-8 py-12 text-center">
          <p className="text-base font-extrabold">No checklist for {monthLabel}</p>
          <p className="mt-2 text-sm font-semibold text-[#6E6B82]">
            {previousMonthWithOccurrences
              ? "Copy last month’s commitments here — they’ll start unchecked."
              : "Set up this month from your commitment list, or add one with + Commitment."}
          </p>
          {canCopy && (
            <button
              type="button"
              onClick={handleCopyFromPrevious}
              disabled={isCopying}
              className="mt-6 rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {isCopying ? "Copying..." : copyLabel}
            </button>
          )}
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard className="!rounded-[16px] !px-[18px] !py-3.5">
            {summary.pendingCount === 0 ? (
              <p className="text-sm font-bold">Nothing pending for {monthLabel}</p>
            ) : (
              <>
                <p className="mb-1 text-sm font-extrabold">
                  {summary.pendingCount} pending
                </p>
                <p className="text-[13px] font-semibold text-[#6E6B82]">
                  {[
                    formatPeriodAmounts(summary.payByCurrency, "pay"),
                    formatPeriodAmounts(summary.receiveByCurrency, "receive"),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Variable amounts still open"}
                </p>
                {soonCount > 0 && (
                  <p className="mt-1.5 text-xs font-bold text-[#B45309]">
                    ◷ {soonCount} due soon
                  </p>
                )}
                {overdueCount > 0 && (
                  <p className="mt-1 text-xs font-bold text-[#EF4444]">
                    ! {overdueCount} overdue
                  </p>
                )}
              </>
            )}
          </SurfaceCard>

          <CommitmentSection
            title={`Pay · ${payRemainingLabel || "UYU 0"} pending`}
            subtitle={`${payDone} of ${payRows.length} done`}
            rows={payRows}
            year={year}
            month={month}
            monthKey={monthKey}
            txById={txById}
            monthTransactions={transactions}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId((current) => (current === id ? null : id))
            }
          />

          <CommitmentSection
            title={`Receive · ${receiveRemainingLabel || "USD 0"} pending`}
            subtitle={`${receiveDone} of ${receiveRows.length} received`}
            rows={receiveRows}
            year={year}
            month={month}
            monthKey={monthKey}
            txById={txById}
            monthTransactions={transactions}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId((current) => (current === id ? null : id))
            }
          />

          {upcoming.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setUpcomingOpen((v) => !v)}
                className="mb-2 text-[13px] font-bold text-[#6E6B82]"
              >
                {upcomingOpen ? "▾" : "▸"} Upcoming commitments ({upcoming.length})
              </button>
              {upcomingOpen && (
                <div className="space-y-1">
                  {upcoming.map((c) => (
                    <p
                      key={c.id}
                      className="text-[13px] font-semibold text-[#9E9AB0]"
                    >
                      {c.name} —{" "}
                      {nextAnnualDueLabel(c, year, month) ?? "Not due this month"}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AddCommitmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        monthKey={monthKey}
      />

      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">
              Reconcile movements
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
              High-confidence matches are linked automatically. Confirm possibles
              below — completed items without a match stay unreconciled.
            </DialogDescription>
          </DialogHeader>
          {autoLinked.length > 0 && (
            <div className="rounded-[14px] bg-[#EAF7F0] px-3.5 py-3 text-[13px] font-semibold text-[#0F9D58]">
              Auto-linked: {autoLinked.join(", ")}
            </div>
          )}
          {suggestions.length === 0 ? (
            <p className="text-sm font-semibold text-[#6E6B82]">
              No possible matches need confirmation.
            </p>
          ) : (
            <div className="max-h-[320px] space-y-3 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.occurrenceId}
                  className="rounded-[14px] border border-[#F1EFF7] px-3.5 py-3"
                >
                  <p className="text-sm font-bold">{suggestion.commitmentName}</p>
                  <p className="mt-1 text-xs font-semibold text-[#6E6B82]">
                    {suggestion.transactionLabel}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-[13px] font-bold text-[#6C3FD1]"
                    onClick={() => {
                      startReconcile(async () => {
                        const result = await confirmOccurrenceMatch({
                          occurrenceId: suggestion.occurrenceId,
                          transactionId: suggestion.transactionId,
                          monthKey,
                        });
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        setSuggestions((current) =>
                          current.filter(
                            (item) => item.occurrenceId !== suggestion.occurrenceId
                          )
                        );
                        router.refresh();
                      });
                    }}
                  >
                    Confirm match
                  </button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setReconcileOpen(false)}
              className="rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
