"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ChevronRight, Pencil } from "lucide-react";
import { toast } from "sonner";

import { updateAccountBalance } from "@/app/actions/settings";
import { AddAccountButton } from "@/components/accounts/add-account-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionTitle, SurfaceCard } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { buildMovementsHref } from "@/lib/navigation/return-to";
import type { AccountCashRow } from "@/lib/queries/account-cash";
import { cn } from "@/lib/utils";

function formatAccountBalance(amount: number, currency: AccountCashRow["currency"]) {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

function EditAccountBalanceDialog({
  account,
  open,
  onOpenChange,
}: {
  account: AccountCashRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openingBalance, setOpeningBalance] = useState(
    account.openingBalance != null ? String(account.openingBalance) : ""
  );
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    account.openingBalanceDate ?? ""
  );

  function handleSave() {
    const trimmed = openingBalance.trim();
    const nextBalance = trimmed === "" ? null : Number(trimmed.replace(/,/g, ""));

    if (trimmed !== "" && (!Number.isFinite(nextBalance) || nextBalance == null)) {
      toast.error("Enter a valid balance");
      return;
    }

    if (nextBalance != null && !openingBalanceDate) {
      toast.error("Choose the date for this balance");
      return;
    }

    startTransition(async () => {
      const result = await updateAccountBalance(account.id, {
        openingBalance: nextBalance,
        openingBalanceDate: nextBalance != null ? openingBalanceDate : null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Balance anchor saved");
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleClear() {
    startTransition(async () => {
      const result = await updateAccountBalance(account.id, {
        openingBalance: null,
        openingBalanceDate: null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Balance anchor cleared");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">Balance anchor</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`opening-balance-${account.id}`}>Balance</Label>
            <Input
              id={`opening-balance-${account.id}`}
              inputMode="decimal"
              value={openingBalance}
              disabled={isPending}
              onChange={(event) => setOpeningBalance(event.target.value)}
              placeholder={`${account.currency} amount`}
              className="rounded-[12px] border-[#E2DEF0]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`opening-date-${account.id}`}>As of</Label>
            <Input
              id={`opening-date-${account.id}`}
              type="date"
              value={openingBalanceDate}
              disabled={isPending}
              onChange={(event) => setOpeningBalanceDate(event.target.value)}
              className="rounded-[12px] border-[#E2DEF0]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {account.hasAnchor ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="rounded-[14px] px-4 py-2 text-sm font-bold text-[#6E6B82]"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-[14px] px-4 py-2 text-sm font-bold text-[#6E6B82]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-[14px] bg-[#6C3FD1] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountCashPanel({
  accounts,
  year,
}: {
  accounts: AccountCashRow[];
  year: number;
}) {
  const [editing, setEditing] = useState<AccountCashRow | null>(null);

  return (
    <>
      <SurfaceCard className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle>Cash in accounts</SectionTitle>
          <AddAccountButton />
        </div>

        {accounts.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-[#6E6B82]">No accounts yet</p>
        ) : (
          <div className="divide-y divide-[#F1EFF7]">
            {accounts.map((account) => {
              const meta = account.hasAnchor
                ? account.openingBalanceDate
                  ? format(parseISO(account.openingBalanceDate), "MMM d, yyyy")
                  : "Anchored"
                : "Imports only";

              return (
                <div
                  key={account.id}
                  className="flex items-center gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <Link
                    href={buildMovementsHref({
                      year,
                      accountId: account.id,
                      returnTo: "/wealth",
                    })}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] py-1 pr-1 transition-colors hover:bg-[#FAF9FC]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{account.displayName}</p>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          account.hasAnchor ? "text-[#9E9AB0]" : "text-[#D97706]"
                        )}
                      >
                        {meta}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-extrabold tabular-nums">
                        {formatMoney(account.balanceUsd)}
                      </p>
                      <p className="text-[11px] font-semibold text-[#9E9AB0]">
                        {formatAccountBalance(account.balance, account.currency)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#C4B5FD]" />
                  </Link>
                  <button
                    type="button"
                    aria-label={`Set balance anchor for ${account.displayName}`}
                    onClick={() => setEditing(account)}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#F3F1F9] hover:text-[#6C3FD1]"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      {editing ? (
        <EditAccountBalanceDialog
          account={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}
