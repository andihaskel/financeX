"use client";

import { OpenImportButton } from "@/components/home/open-import-button";
import type { AccountImportStatus } from "@/lib/queries/import-coverage";

export function MissingImportBadge({
  month,
  accounts,
}: {
  month: string;
  accounts: AccountImportStatus[];
}) {
  const missing = accounts.filter((account) => !account.imported);
  if (missing.length === 0) return null;

  const label = `${missing.map((account) => account.shortLabel).join(" · ")} missing`;

  return (
    <OpenImportButton month={month}>
      <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white">
        {label} · + Add
      </span>
    </OpenImportButton>
  );
}
