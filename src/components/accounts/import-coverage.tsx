import type { AccountImportStatus } from "@/lib/queries/import-coverage";

export function ImportCoverageCompact({ accounts }: { accounts: AccountImportStatus[] }) {
  if (accounts.length === 0) return null;

  return (
    <p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#9E9AB0]">
      {accounts.map((account, index) => (
        <span key={account.id}>
          {index > 0 && <span className="px-1">·</span>}
          <span className={account.imported ? "text-[#6E6B82]" : "text-[#C7C3D6]"}>
            {account.imported ? "✓" : "—"} {account.shortLabel}
          </span>
        </span>
      ))}
    </p>
  );
}

export function ImportCoveragePanel({
  monthLabel,
  accounts,
}: {
  monthLabel: string;
  accounts: AccountImportStatus[];
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="rounded-[16px] border border-[#F1EFF7] bg-[#FAF9FC] px-4 py-3">
      <p className="mb-2 text-xs font-bold text-[#6E6B82]">{monthLabel}</p>
      <div className="space-y-1">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between text-xs font-semibold"
          >
            <span className="text-[#6E6B82]">{account.name}</span>
            <span className={account.imported ? "text-[#10B981]" : "text-[#9E9AB0]"}>
              {account.imported ? "✓" : "Not imported"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
