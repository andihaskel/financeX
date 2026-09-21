import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { RulesTable } from "@/components/rules/rules-table";
import { IncognitoSettingsToggle } from "@/components/privacy/incognito-settings-toggle";
import { SettingsForm } from "@/components/settings/settings-form";
import { SurfaceCard } from "@/components/ui/surface";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Account,
  CategorizationRule,
  Category,
  IncomeSource,
  UserSettings,
} from "@/types/database";

function buildSettingsItems({
  settings,
  accounts,
  categories,
  rules,
  incomeSources,
}: {
  settings: UserSettings | null;
  accounts: Account[];
  categories: Category[];
  rules: CategorizationRule[];
  incomeSources: IncomeSource[];
}) {
  const savingsPercent = settings?.savings_target_percent ?? 40;
  const activeIncome = incomeSources.filter((s) => s.active).length;
  const currency = settings?.base_currency ?? "USD";
  const rate = settings?.uyu_to_usd_rate ?? 40;

  return [
    {
      id: "general",
      label: "General",
      hint: `Save ${savingsPercent}% · ${currency} · ${rate} UYU · ${activeIncome} income source${activeIncome === 1 ? "" : "s"}`,
    },
    {
      id: "accounts",
      label: "Accounts",
      hint: `${accounts.length} bank${accounts.length === 1 ? "" : "s"} and cards`,
    },
    {
      id: "categories",
      label: "Categories",
      hint: `${categories.length} spending groups`,
    },
    {
      id: "rules",
      label: "Rules",
      hint: `${rules.length} auto-sort rule${rules.length === 1 ? "" : "s"}`,
    },
  ];
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const params = await searchParams;
  const section = params.section;
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const [settingsResult, accountsResult, categoriesResult, incomeResult, rulesResult, countsResult] =
    await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      supabase.from("accounts").select("*").eq("user_id", user.id).order("name"),
      supabase.from("categories").select("*").eq("user_id", user.id).order("name"),
      supabase.from("income_sources").select("*").eq("user_id", user.id),
      supabase
        .from("categorization_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("priority"),
      supabase
        .from("transactions")
        .select("categorization_rule_id")
        .eq("user_id", user.id)
        .not("categorization_rule_id", "is", null),
    ]);

  const settings = (settingsResult.data ?? null) as UserSettings | null;
  const accounts = (accountsResult.data ?? []) as Account[];
  const categories = (categoriesResult.data ?? []) as Category[];
  const incomeSources = (incomeResult.data ?? []) as IncomeSource[];
  const rules = (rulesResult.data ?? []) as CategorizationRule[];

  const countMap = new Map<string, number>();
  for (const tx of countsResult.data ?? []) {
    if (tx.categorization_rule_id) {
      countMap.set(
        tx.categorization_rule_id,
        (countMap.get(tx.categorization_rule_id) ?? 0) + 1
      );
    }
  }

  const items = buildSettingsItems({
    settings,
    accounts,
    categories,
    rules,
    incomeSources,
  });

  if (!section) {
    return (
      <div className="space-y-6">
        <h1 className="text-[26px] font-extrabold">Settings</h1>
        <SurfaceCard className="px-6 py-1">
          {items.map((item, index) => (
            <Link
              key={`${item.id}-${item.label}`}
              href={`/settings?section=${item.id}`}
              className={`flex items-center gap-2 py-4 ${
                index < items.length - 1 ? "border-b border-[#F1EFF7]" : ""
              }`}
            >
              <span className="text-sm font-bold">{item.label}</span>
              <span className="text-[13px] font-semibold text-[#6E6B82] tabular-nums">{item.hint}</span>
              <span className="ml-auto text-[#D8D4E8]">→</span>
            </Link>
          ))}
        </SurfaceCard>

        <SurfaceCard className="px-6 py-1">
          <IncognitoSettingsToggle />
        </SurfaceCard>

        <SurfaceCard className="px-6 py-1">
          <Link
            href="/apps"
            className="flex items-center gap-2 border-b border-[#F1EFF7] py-4"
          >
            <span className="text-sm font-bold">Go to Your space</span>
            <span className="text-[13px] font-semibold text-[#6E6B82]">
              Switch apps
            </span>
            <span className="ml-auto text-[#D8D4E8]">→</span>
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 py-4 text-left"
            >
              <span className="text-sm font-bold text-[#B91C1C]">Sign out</span>
              <span className="ml-auto text-[#D8D4E8]">→</span>
            </button>
          </form>
        </SurfaceCard>
      </div>
    );
  }

  const sectionTitle =
    section === "rules"
      ? "Rules"
      : section === "accounts"
        ? "Accounts"
        : section === "categories"
          ? "Categories"
          : "General";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm font-semibold text-[#6E6B82] hover:text-[#6C3FD1]"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-[26px] font-extrabold">{sectionTitle}</h1>
      </div>

      {section === "rules" ? (
        <RulesTable
          rules={rules}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          usageCounts={Object.fromEntries(countMap)}
        />
      ) : (
        <SettingsForm
          section={section}
          settings={settings}
          accounts={accounts}
          categories={categories}
          incomeSources={incomeSources}
        />
      )}
    </div>
  );
}
