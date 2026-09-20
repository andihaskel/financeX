import { format, parseISO } from "date-fns";
import { Upload } from "lucide-react";

import { getMonthDateRange, MonthNav } from "@/components/dashboard/month-nav";
import { LinkButton } from "@/components/ui/link-button";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { getUserSettings } from "@/lib/queries/finance";
import { hasAnyTransactions, resolveViewMonth } from "@/lib/queries/month";
import { createClient, getUser } from "@/lib/supabase/server";
import type { TransactionWithRelations } from "@/types/database";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    account?: string;
    category?: string;
    type?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const month = await resolveViewMonth(params.month);
  const anyTransactions = await hasAnyTransactions();
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from("transactions")
    .select("*, accounts(id, name, type, currency), categories(id, name, slug, group)")
    .eq("user_id", user.id)
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .order("transaction_date", { ascending: false })
    .limit(200);

  if (params.account) query = query.eq("account_id", params.account);
  if (params.category) query = query.eq("category_id", params.category);
  if (params.type) query = query.eq("transaction_type", params.type);

  const [{ data: transactions }, { data: accounts }, { data: categories }, settings] =
    await Promise.all([
      query,
      supabase.from("accounts").select("id, name").eq("user_id", user.id),
      supabase.from("categories").select("id, name").eq("user_id", user.id).eq("active", true),
      getUserSettings(),
    ]);

  let filtered = (transactions ?? []) as TransactionWithRelations[];
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.normalized_description.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    if (!anyTransactions) {
      return (
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
          <h1 className="text-2xl font-semibold">No transactions yet</h1>
          <p className="mt-2 text-muted-foreground">
            Import your bank statements to start tracking transactions.
          </p>
          <LinkButton href="/import" className="mt-6">
            <Upload className="mr-2 h-4 w-4" />
            Import your first CSV
          </LinkButton>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">No transactions in this month</h1>
        <p className="text-muted-foreground">
          {format(parseISO(`${month}-01`), "MMMM yyyy")} has no transactions.
        </p>
        <div className="flex justify-center">
          <MonthNav month={month} basePath="/transactions" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">{month}</p>
      </div>
      <TransactionsTable
        transactions={filtered}
        accounts={accounts ?? []}
        categories={categories ?? []}
        uyuToUsdRate={settings?.uyu_to_usd_rate ?? 40}
        month={month}
        filters={params}
      />
    </div>
  );
}
