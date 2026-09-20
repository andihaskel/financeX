import { format, parseISO, subMonths, addMonths } from "date-fns";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MonthNavProps {
  month: string;
  basePath?: string;
}

export function MonthNav({ month, basePath = "/dashboard" }: MonthNavProps) {
  const current = parseISO(`${month}-01`);
  const prev = format(subMonths(current, 1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");
  const label = format(current, "MMMM yyyy");

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${basePath}?month=${prev}`}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[140px] text-center text-sm font-medium">{label}</span>
      <Link
        href={`${basePath}?month=${next}`}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function getMonthParam(searchParams: { month?: string }): string {
  if (searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)) {
    return searchParams.month;
  }
  return format(new Date(), "yyyy-MM");
}

export function getMonthDateRange(month: string) {
  const start = `${month}-01`;
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
