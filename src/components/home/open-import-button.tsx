"use client";

import { useImportDialog } from "@/components/import/import-dialog-store";
import { cn } from "@/lib/utils";

export function OpenImportButton({
  month,
  accountId,
  children,
  className,
}: {
  month: string;
  accountId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = useImportDialog();

  return (
    <button
      type="button"
      className={cn("text-left", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open({ month, accountId });
      }}
    >
      {children}
    </button>
  );
}
