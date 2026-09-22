import Link from "next/link";

import { WealthClient } from "@/components/wealth/wealth-client";
import { AccountCashPanel } from "@/components/accounts/account-cash-panel";
import { GradientHero, PageTitleWithInfo, SectionTitle, SubsectionLabel, SurfaceCard } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { buildMovementsHref } from "@/lib/navigation/return-to";
import { getAccountCashSummary } from "@/lib/queries/account-cash";
import { getActiveAccounts } from "@/lib/queries/finance";
import { getWealthFlowSummary, getWealthSummary } from "@/lib/queries/wealth";

function TransferStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "muted";
}) {
  return (
    <div className="rounded-[14px] bg-[#FAF9FC] px-3.5 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#9E9AB0]">{label}</p>
      <p
        className={`mt-1 text-base font-extrabold tabular-nums ${
          tone === "danger"
            ? "text-[#EF4444]"
            : tone === "muted"
              ? "text-[#6E6B82]"
              : "text-[#1C1B29]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function WealthPage() {
  const year = new Date().getFullYear();
  const [wealth, cash, flow, accounts] = await Promise.all([
    getWealthSummary(),
    getAccountCashSummary(),
    getWealthFlowSummary(year),
    getActiveAccounts(),
  ]);

  const totalNetWorthUsd = wealth.totalUsd + cash.totalUsd;
  const showTransferStats =
    flow.unclassifiedOutCount > 0 ||
    flow.toPositionsUsd > 0 ||
    flow.externalOutUsd > 0 ||
    flow.internalOutUsd > 0;

  return (
    <div className="space-y-4">
      <PageTitleWithInfo title="Wealth" infoKey="wealth.page" />

      <GradientHero className="px-6 py-5">
        <SubsectionLabel tone="hero" className="mb-1">
          Net worth
        </SubsectionLabel>
        <p className="text-[32px] font-extrabold tabular-nums">{formatMoney(totalNetWorthUsd)}</p>
        <div className="mt-4 flex flex-wrap gap-6 text-sm font-semibold opacity-90">
          <span>
            Cash{" "}
            <span className="font-extrabold tabular-nums">{formatMoney(cash.totalUsd)}</span>
          </span>
          <span>
            Positions{" "}
            <span className="font-extrabold tabular-nums">{formatMoney(wealth.totalUsd)}</span>
          </span>
        </div>
      </GradientHero>

      <AccountCashPanel accounts={cash.accounts} year={year} />

      {showTransferStats ? (
        <SurfaceCard className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionTitle className="mb-0">
              Transfers · {flow.year}
            </SectionTitle>
            {flow.unclassifiedOutCount > 0 ? (
              <Link
                href={buildMovementsHref({
                  year,
                  type: "transfer",
                  returnTo: "/wealth",
                })}
                className="shrink-0 text-xs font-bold text-[#6C3FD1] hover:text-[#5A32B8]"
              >
                Tag {flow.unclassifiedOutCount} →
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TransferStat label="To positions" value={formatMoney(flow.toPositionsUsd)} />
            <TransferStat label="Internal" value={formatMoney(flow.internalOutUsd)} />
            <TransferStat
              label="Untracked out"
              value={formatMoney(flow.externalOutUsd)}
              tone={flow.externalOutUsd > 0 ? "danger" : "default"}
            />
            <TransferStat
              label="Untagged"
              value={String(flow.unclassifiedOutCount)}
              tone={flow.unclassifiedOutCount > 0 ? "muted" : "default"}
            />
          </div>
        </SurfaceCard>
      ) : null}

      <WealthClient positions={wealth.positions} accounts={accounts} year={year} />
    </div>
  );
}
