import { RulesTable } from "@/components/rules/rules-table";
import { createClient, getUser } from "@/lib/supabase/server";
import type { CategorizationRule, Category } from "@/types/database";

export default async function RulesPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [rulesResult, categoriesResult, countsResult] = await Promise.all([
    supabase
      .from("categorization_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("priority"),
    supabase.from("categories").select("id, name").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("categorization_rule_id")
      .eq("user_id", user.id)
      .not("categorization_rule_id", "is", null),
  ]);

  const rules = (rulesResult.data ?? []) as CategorizationRule[];
  const categories = (categoriesResult.data ?? []) as Pick<Category, "id" | "name">[];

  const countMap = new Map<string, number>();
  for (const tx of countsResult.data ?? []) {
    if (tx.categorization_rule_id) {
      countMap.set(
        tx.categorization_rule_id,
        (countMap.get(tx.categorization_rule_id) ?? 0) + 1
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rules</h1>
        <p className="text-sm text-muted-foreground">
          Manage categorization rules applied during import
        </p>
      </div>
      <RulesTable
        rules={rules}
        categories={categories}
        usageCounts={Object.fromEntries(countMap)}
      />
    </div>
  );
}
