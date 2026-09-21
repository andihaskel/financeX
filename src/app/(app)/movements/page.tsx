import { OpenImportButton } from "@/components/home/open-import-button";
import { MovementsBrowser } from "@/components/movements/movements-browser";
import { SurfaceCard } from "@/components/ui/surface";
import { getAccounts, getCategories } from "@/lib/queries/finance";
import { hasAnyTransactions, resolveViewMonth } from "@/lib/queries/month";
import { getWealthSummary } from "@/lib/queries/wealth";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  formatSupabaseError,
  isMissingColumnError,
  TRANSACTION_WITH_RELATIONS_SELECT,
} from "@/lib/supabase/errors";
import type { TransactionWithRelations } from "@/types/database";

const FETCH_CAP = 2000;

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    year?: string;
    from?: string;
    account?: string;
    category?: string;
    type?: string;
    transferTo?: string;
    extraordinary?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const yearFilter = params.year && /^\d{4}$/.test(params.year) ? params.year : null;

  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const month =
    yearFilter != null
      ? `${yearFilter}-01`
      : params.month && /^\d{4}-\d{2}$/.test(params.month)
        ? params.month
        : await resolveViewMonth(params.month);

  const viewingYear = Boolean(yearFilter && !params.month);

  let start: string;
  let end: string;
  if (viewingYear && yearFilter) {
    start = `${yearFilter}-01-01`;
    end = `${yearFilter}-12-31`;
  } else {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    start = `${month}-01`;
    end = `${month}-${String(lastDay).padStart(2, "0")}`;
  }

  const [anyTransactions, accounts, categories, wealth, txResult] = await Promise.all([
    hasAnyTransactions(),
    getAccounts(),
    getCategories(),
    getWealthSummary(),
    supabase
      .from("transactions")
      .select(TRANSACTION_WITH_RELATIONS_SELECT)
      .eq("user_id", user.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(FETCH_CAP),
  ]);

  if (txResult.error) {
    console.error("movements query failed", formatSupabaseError(txResult.error), txResult.error);
  }

  if (!anyTransactions) {
    return (
      <div className="space-y-4">
        <h1 className="text-[26px] font-extrabold">Movements</h1>
        <SurfaceCard className="px-10 py-14 text-center">
          <p className="text-base font-bold">Nothing here yet.</p>
          <p className="mt-2 text-sm font-semibold text-[#6E6B82]">
            Add your bank and card files to start tracking movements.
          </p>
          <OpenImportButton month={month}>
            <span className="mt-6 inline-block rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white">
              + Add movements
            </span>
          </OpenImportButton>
        </SurfaceCard>
      </div>
    );
  }

  if (txResult.error) {
    const needsMigration = isMissingColumnError(txResult.error);

    return (
      <div className="space-y-4">
        <h1 className="text-[26px] font-extrabold">Movements</h1>
        <SurfaceCard className="px-8 py-10 text-center">
          <p className="font-bold">Could not load movements.</p>
          <p className="mt-2 text-sm font-semibold text-[#6E6B82]">
            {formatSupabaseError(txResult.error)}
          </p>
          {needsMigration ? (
            <p className="mt-3 text-sm font-semibold text-[#B91C1C]">
              Run pending Supabase migrations, especially{" "}
              <code className="rounded bg-[#F3F1F9] px-1.5 py-0.5">012_wealth_reconciliation.sql</code>
              .
            </p>
          ) : null}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <MovementsBrowser
      key={[
        viewingYear ? yearFilter : month,
        params.account,
        params.category,
        params.type,
        params.transferTo,
        params.extraordinary,
        params.q,
        params.sort,
        params.from,
      ].join("|")}
      month={month}
      year={viewingYear ? yearFilter ?? undefined : undefined}
      accounts={accounts}
      categories={categories}
      wealthPositions={wealth.positions.map((position) => ({
        id: position.id,
        name: position.name,
      }))}
      transactions={(txResult.data ?? []) as TransactionWithRelations[]}
      initialFilters={params}
    />
  );
}
