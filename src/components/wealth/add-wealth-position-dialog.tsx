"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { createWealthPosition } from "@/app/actions/wealth";
import {
  WealthPositionForm,
  type WealthPositionFormValues,
} from "@/components/wealth/wealth-position-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Account } from "@/types/database";

export function AddWealthPositionDialog({
  accounts,
  open,
  onOpenChange,
}: {
  accounts: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formId = "add-wealth-position-form";

  function handleSubmit(values: WealthPositionFormValues) {
    startTransition(async () => {
      const result = await createWealthPosition(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Position added");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">Add position</DialogTitle>
          <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
            Track a balance that is not fully captured by monthly income flows.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <WealthPositionForm
            key="add-wealth-position"
            formId={formId}
            accounts={accounts}
            onSubmit={handleSubmit}
          />
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="submit"
            form={formId}
            disabled={isPending}
            className="w-full rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save position"}
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
