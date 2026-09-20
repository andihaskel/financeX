"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deletePeriodTransactions } from "@/app/actions/transactions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DeleteMovementsTarget } from "@/types/delete-movements";

function DeleteMovementsButton({
  periodLabel,
  month,
  year,
  target,
}: {
  periodLabel: string;
  month?: string;
  year?: string;
  target: DeleteMovementsTarget;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePeriodTransactions({
        month,
        year,
        accountId: target.accountId,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Deleted ${result.deleted} ${target.accountLabel} movement${result.deleted === 1 ? "" : "s"} from ${periodLabel}`
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
            className="text-sm font-bold text-[#EF4444] transition-opacity hover:opacity-80"
          />
        }
      >
        Delete {periodLabel} · {target.accountLabel}
      </DialogTrigger>
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">
            Delete {target.accountLabel}?
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
            This will permanently remove {target.count} movement
            {target.count === 1 ? "" : "s"} from {target.accountLabel} in {periodLabel}. Other
            accounts will not be affected.
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

export function DeleteMovementsSection({
  periodLabel,
  month,
  year,
  targets,
}: {
  periodLabel: string;
  month?: string;
  year?: string;
  targets: DeleteMovementsTarget[];
}) {
  if (targets.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      {targets.map((target) => (
        <DeleteMovementsButton
          key={target.accountId}
          periodLabel={periodLabel}
          month={month}
          year={year}
          target={target}
        />
      ))}
    </div>
  );
}
