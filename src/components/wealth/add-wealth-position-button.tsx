"use client";

import { useState } from "react";

import { AddWealthPositionDialog } from "@/components/wealth/add-wealth-position-dialog";
import type { Account } from "@/types/database";

export function AddWealthPositionButton({
  accounts,
  className,
}: {
  accounts: Account[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E2DEF0] bg-white px-4 py-2 text-sm font-bold text-[#6C3FD1] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:bg-[#FAF9FC]"
        }
      >
        + Add position
      </button>
      <AddWealthPositionDialog accounts={accounts} open={open} onOpenChange={setOpen} />
    </>
  );
}
