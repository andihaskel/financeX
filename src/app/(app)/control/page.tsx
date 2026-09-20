import { format } from "date-fns";

import { ControlClient } from "@/components/control/control-client";
import { SurfaceCard } from "@/components/ui/surface";
import { getControlMonthBundle } from "@/lib/queries/control";

export default async function ControlPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const monthKey =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : format(new Date(), "yyyy-MM");
  const bundle = await getControlMonthBundle(monthKey);

  if (!bundle) {
    return (
      <SurfaceCard className="py-12 text-center">
        <p className="font-bold">Sign in to use Control.</p>
      </SurfaceCard>
    );
  }

  return (
    <ControlClient
      monthKey={bundle.monthKey}
      year={bundle.year}
      month={bundle.month}
      commitments={bundle.commitments}
      occurrences={bundle.occurrences}
      transactions={bundle.transactions}
      previousMonthWithOccurrences={bundle.previousMonthWithOccurrences}
      hasApplicableCommitments={bundle.hasApplicableCommitments}
    />
  );
}
