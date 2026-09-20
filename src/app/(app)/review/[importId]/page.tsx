import { format, parseISO } from "date-fns";
import { notFound } from "next/navigation";

import { ReviewPanel } from "@/components/review/review-panel";
import { transactionNeedsUserHelp, isNeedsReviewForImport } from "@/lib/categorization/openai-classify";
import { getPrimaryMonthFromDates } from "@/lib/queries/month";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Category, Transaction } from "@/types/database";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const user = await getUser();
  if (!user) return notFound();

  const supabase = await createClient();

  const { data: importRecord } = await supabase
    .from("imports")
    .select("*")
    .eq("id", importId)
    .eq("user_id", user.id)
    .single();

  if (!importRecord) return notFound();

  const [txResult, catResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("import_id", importId)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false }),
    supabase.from("categories").select("*").eq("user_id", user.id).eq("active", true),
  ]);

  const transactions = (txResult.data ?? []) as Transaction[];
  const categories = (catResult.data ?? []) as Category[];

  const viewMonth =
    getPrimaryMonthFromDates(transactions.map((t) => t.transaction_date)) ??
    format(new Date(), "yyyy-MM");

  const monthLabel = format(parseISO(`${viewMonth}-01`), "MMMM yyyy");

  const stats = {
    auto: transactions.filter((t) => t.categorization_status === "auto").length,
    suggested: transactions.filter((t) => t.categorization_status === "suggested").length,
    needsReview: transactions.filter((t) =>
      isNeedsReviewForImport(t.categorization_status, t, categories)
    ).length,
    needsHelp: transactions.filter((t) => transactionNeedsUserHelp(t)).length,
  };

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <ReviewPanel
        importId={importId}
        filename={importRecord.filename}
        monthLabel={monthLabel}
        transactions={transactions}
        categories={categories}
        stats={stats}
        viewMonth={viewMonth}
      />
    </div>
  );
}
