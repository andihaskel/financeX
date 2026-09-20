import { TargetBudgetForm } from "@/components/target/target-budget-form";
import { SurfaceCard } from "@/components/ui/surface";
import { formatMoney } from "@/lib/design/format";
import { getTargetBudgets, getTargetSummary } from "@/lib/queries/finance";
import { resolveViewMonth } from "@/lib/queries/month";

export default async function TargetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = await resolveViewMonth(params.month);
  const [budgetData, summary] = await Promise.all([
    getTargetBudgets(month),
    getTargetSummary(month),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold">Monthly target</h1>
        <p className="mt-1.5 text-sm font-semibold text-[#6E6B82]">
          These are your defaults — every month uses this target unless you change it.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4">
        {[
          { label: "Expected income", value: formatMoney(summary.expectedIncome) },
          { label: "Target to spend", value: formatMoney(summary.targetToSpend) },
          {
            label: "Goal to save",
            value: formatMoney(summary.goalToSave),
            accent: true,
          },
        ].map((card) => (
          <SurfaceCard key={card.label} className="px-6 py-5">
            <p className="text-[13px] font-semibold text-[#6E6B82]">{card.label}</p>
            <p
              className={`mt-2 text-[22px] font-extrabold ${
                card.accent ? "text-[#6C3FD1]" : ""
              }`}
            >
              {card.value}
            </p>
          </SurfaceCard>
        ))}
      </div>

      <TargetBudgetForm
        month={`${month}-01`}
        data={budgetData.map((row) => ({
          categoryId: row.categoryId,
          name: row.name,
          slug: row.slug,
          budget: row.budget,
        }))}
        targetToSpend={summary.targetToSpend}
      />
    </div>
  );
}
