import { OpenImportButton } from "@/components/home/open-import-button";
import { MovementsBrowser } from "@/components/movements/movements-browser";
import { SurfaceCard } from "@/components/ui/surface";
import { getAccounts, getCategories } from "@/lib/queries/finance";
import { hasAnyTransactions, resolveViewMonth } from "@/lib/queries/month";
import { createClient, getUser } from "@/lib/supabase/server";
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
    extraordinary?: string;
    q?: string;
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

  const [anyTransactions, accounts, categories, txResult] = await Promise.all([
    hasAnyTransactions(),
    getAccounts(),
    getCategories(),
    supabase
      .from("transactions")
      .select("*, accounts(id, name, type, currency), categories(id, name, slug, group)")
      .eq("user_id", user.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(FETCH_CAP),
  ]);

  if (txResult.error) {
    console.error("movements query failed", txResult.error);
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

  return (
    <MovementsBrowser
      key={[
        viewingYear ? yearFilter : month,
        params.account,
        params.category,
        params.type,
        params.extraordinary,
        params.q,
        params.from,
      ].join("|")}
      month={month}
      year={viewingYear ? yearFilter ?? undefined : undefined}
      accounts={accounts}
      categories={categories}
      transactions={(txResult.data ?? []) as TransactionWithRelations[]}
      initialFilters={params}
    />
  );
}
