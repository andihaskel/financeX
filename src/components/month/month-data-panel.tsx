"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deletePeriodTransactions } from "@/app/actions/transactions";
import { OpenImportButton } from "@/components/home/open-import-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SectionTitle, SurfaceCard } from "@/components/ui/surface";

export interface MonthDataAccountRow {
  id: string;
  name: string;
  shortLabel: string;
  imported: boolean;
  count: number;
  color: string;
}

function DeleteAccountDataButton({
  month,
  monthLabel,
  account,
}: {
  month: string;
  monthLabel: string;
  account: MonthDataAccountRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePeriodTransactions({
        month,
        accountId: account.id,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Deleted ${result.deleted} ${account.name} movement${result.deleted === 1 ? "" : "s"} from ${monthLabel}`
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Delete ${account.name} data for ${monthLabel}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
          />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">
            Delete {account.name}?
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
            This will permanently remove {account.count} movement
            {account.count === 1 ? "" : "s"} from {account.name} in {monthLabel}. Other accounts
            will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
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
            {isPending ? "Deleting..." : "Delete movements"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonthDataPanel({
  month,
  monthLabel,
  accounts,
}: {
  month: string;
  monthLabel: string;
  accounts: MonthDataAccountRow[];
}) {
  if (accounts.length === 0) return null;

  return (
    <div>
      <SectionTitle>This month&apos;s data</SectionTitle>
      <SurfaceCard className="px-5 py-1">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-3 border-b border-[#F1EFF7] py-4 last:border-0"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: account.color }}
              aria-hidden
            />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1C1B29]">
              {account.name}
            </p>
            {account.count > 0 ? (
              <div className="flex shrink-0 items-center gap-3">
                <OpenImportButton month={month} accountId={account.id}>
                  <span className="text-[13px] font-bold text-[#6C3FD1]">+ Add more</span>
                </OpenImportButton>
                <DeleteAccountDataButton
                  month={month}
                  monthLabel={monthLabel}
                  account={account}
                />
              </div>
            ) : account.imported ? (
              <span className="shrink-0 text-[13px] font-bold text-[#10B981]">✓</span>
            ) : (
              <OpenImportButton month={month} accountId={account.id}>
                <span className="shrink-0 text-[13px] font-bold text-[#6C3FD1]">+ Add</span>
              </OpenImportButton>
            )}
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
