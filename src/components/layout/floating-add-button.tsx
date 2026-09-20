"use client";

import { useImportDialog } from "@/components/import/import-dialog-store";
import { cn } from "@/lib/utils";

export function AddMovementsButton({
  month,
  accountId,
  className,
}: {
  month?: string;
  accountId?: string;
  className?: string;
}) {
  const { open } = useImportDialog();

  return (
    <button
      type="button"
      onClick={() => open({ month, accountId })}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(108,63,209,0.35)] transition-opacity hover:opacity-90",
        className
      )}
    >
      <span className="text-base leading-none">+</span>
      Add movements
    </button>
  );
}

/** @deprecated Use AddMovementsButton */
export function FloatingAddButton(props: {
  month?: string;
  accountId?: string;
  className?: string;
}) {
  return <AddMovementsButton {...props} />;
}
