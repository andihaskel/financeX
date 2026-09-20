import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  trend?: "positive" | "negative" | "neutral";
}

export function KpiCard({ label, value, sublabel, trend = "neutral" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-tight",
          trend === "positive" && "text-emerald-600",
          trend === "negative" && "text-rose-600"
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>
      )}
    </div>
  );
}
