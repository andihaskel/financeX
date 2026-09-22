"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWealthPosition } from "@/app/actions/wealth";
import { AddWealthPositionButton } from "@/components/wealth/add-wealth-position-button";
import { EditWealthPositionDialog } from "@/components/wealth/edit-wealth-position-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionTitle, SurfaceCard } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { buildMovementsHref } from "@/lib/navigation/return-to";
import type { WealthPositionRow } from "@/lib/queries/wealth";
import { wealthKindLabel } from "@/lib/wealth/helpers";
import type { Account } from "@/types/database";

export function WealthClient({
  positions,
  accounts,
  year,
}: {
  positions: WealthPositionRow[];
  accounts: Account[];
  year: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<WealthPositionRow | null>(null);
  const [deleting, setDeleting] = useState<WealthPositionRow | null>(null);

  function handleDelete() {
    if (!deleting) return;

    startTransition(async () => {
      const result = await deleteWealthPosition(deleting.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <>
      <SurfaceCard className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionTitle className="mb-0">Positions</SectionTitle>
          <AddWealthPositionButton accounts={accounts} />
        </div>

        {positions.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-[#6E6B82]">No positions yet</p>
        ) : (
          <div className="divide-y divide-[#F1EFF7]">
            {positions.map((position) => (
              <div
                key={position.id}
                className="flex items-center gap-2 py-3 first:pt-0 last:pb-0"
              >
                <Link
                  href={buildMovementsHref({
                    year,
                    wealthPositionId: position.id,
                    returnTo: "/wealth",
                  })}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] py-1 pr-1 transition-colors hover:bg-[#FAF9FC]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{position.name}</p>
                    <p className="truncate text-xs font-semibold text-[#9E9AB0]">
                      {wealthKindLabel(position.kind)}
                      {position.accountName ? ` · ${position.accountName}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold tabular-nums">
                      {formatMoney(position.amountUsd)}
                    </p>
                    <p className="text-[11px] font-semibold text-[#9E9AB0] tabular-nums">
                      {position.currency} {Math.round(position.amount).toLocaleString("en-US")}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-[#C4B5FD]" />
                </Link>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    aria-label={`Edit ${position.name}`}
                    onClick={() => setEditing(position)}
                    className="inline-flex size-9 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#F3F1F9] hover:text-[#6C3FD1]"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${position.name}`}
                    onClick={() => setDeleting(position)}
                    className="inline-flex size-9 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {editing ? (
        <EditWealthPositionDialog
          position={editing}
          accounts={accounts}
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      ) : null}

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold">
              Remove {deleting?.name}?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-[14px] px-4 py-2 text-sm font-bold text-[#6E6B82]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-[14px] bg-[#EF4444] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {isPending ? "Removing..." : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
