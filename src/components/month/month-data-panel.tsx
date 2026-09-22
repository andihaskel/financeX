"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Eye, Plus, Trash2 } from "lucide-react";
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
import { buildMovementsHref } from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

export interface MonthDataAccountRow {
  id: string;
  name: string;
  shortLabel: string;
  imported: boolean;
  count: number;
  color: string;
  lastUploadedAt: string | null;
}

function lastUploadLabel(iso: string | null) {
  if (!iso) return "No file uploaded this month";
  return `Last upload this month · ${format(parseISO(iso), "MMM d, yyyy")}`;
}

function AccountActionIcon({
  label,
  href,
  onClick,
  tone = "muted",
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "muted" | "danger" | "brand";
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
    tone === "danger" && "text-[#9E9AB0] hover:bg-[#FEE2E2] hover:text-[#EF4444]",
    tone === "brand" && "text-[#9E9AB0] hover:bg-[#F3F1F9] hover:text-[#6C3FD1]",
    tone === "muted" && "text-[#9E9AB0] hover:bg-[#F3F1F9] hover:text-[#1C1B29]"
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

const addIconClassName =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#F3F1F9] hover:text-[#6C3FD1]";

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

function AccountRowActions({
  month,
  monthLabel,
  account,
}: {
  month: string;
  monthLabel: string;
  account: MonthDataAccountRow;
}) {
  const movementsHref = buildMovementsHref({
    month,
    accountId: account.id,
    returnTo: `/month/${month}`,
  });

  if (account.count > 0) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <OpenImportButton
          month={month}
          accountId={account.id}
          className={addIconClassName}
        >
          <Plus className="size-4" aria-hidden />
          <span className="sr-only">Add {account.name} movements</span>
        </OpenImportButton>
        <AccountActionIcon label={`View ${account.name} movements`} href={movementsHref}>
          <Eye className="size-4" />
        </AccountActionIcon>
        <DeleteAccountDataButton month={month} monthLabel={monthLabel} account={account} />
      </div>
    );
  }

  if (account.imported) {
    return <span className="shrink-0 text-[13px] font-bold text-[#10B981]">✓</span>;
  }

  return (
    <OpenImportButton month={month} accountId={account.id} className={addIconClassName}>
      <Plus className="size-4" aria-hidden />
      <span className="sr-only">Add {account.name} movements</span>
    </OpenImportButton>
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
      <SectionTitle infoKey="month.thisMonthsData">This month&apos;s data</SectionTitle>
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1C1B29]">{account.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-[#9E9AB0]">
                {lastUploadLabel(account.lastUploadedAt)}
              </p>
            </div>
            <AccountRowActions month={month} monthLabel={monthLabel} account={account} />
          </div>
        ))}
      </SurfaceCard>
    </div>
  );
}
