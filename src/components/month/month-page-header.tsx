"use client";

import Link from "next/link";
import { addMonths, format, parseISO, subMonths } from "date-fns";

import { MonthHeroNav } from "@/components/shared/month-title-picker";
import { SectionInfoButton } from "@/components/ui/surface";

export function MonthPageHeader({ month }: { month: string }) {
  const current = parseISO(`${month}-01`);
  const prev = format(subMonths(current, 1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");

  return (
    <div className="mb-5 flex items-center gap-3.5">
      <Link href={`/month/${prev}`} className="text-base opacity-70">
        ‹
      </Link>
      <MonthHeroNav month={month} navigateTo={(m) => `/month/${m}`} />
      <Link href={`/month/${next}`} className="text-base opacity-70">
        ›
      </Link>
      <SectionInfoButton infoKey="month.page" variant="subtle" className="ml-1" />
    </div>
  );
}

export function MonthEmptyHeader({ month }: { month: string }) {
  const current = parseISO(`${month}-01`);
  const prev = format(subMonths(current, 1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");

  return (
    <div className="mb-4 flex items-center justify-center gap-3.5">
      <Link href={`/month/${prev}`} className="text-[#6E6B82]">
        ‹
      </Link>
      <MonthHeroNav month={month} navigateTo={(m) => `/month/${m}`} />
      <Link href={`/month/${next}`} className="text-[#6E6B82]">
        ›
      </Link>
      <SectionInfoButton infoKey="month.page" variant="subtle" className="ml-1" />
    </div>
  );
}
