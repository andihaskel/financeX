"use client";

import Link from "next/link";
import { addMonths, format, parseISO, subMonths } from "date-fns";

import { AddMovementsButton } from "@/components/layout/floating-add-button";
import { MonthHeroNav } from "@/components/shared/month-title-picker";

export function MonthPageHeader({ month }: { month: string }) {
  const current = parseISO(`${month}-01`);
  const prev = format(subMonths(current, 1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3.5">
      <div className="flex items-center gap-3.5">
        <Link href={`/month/${prev}`} className="text-base opacity-70">
          ‹
        </Link>
        <MonthHeroNav month={month} navigateTo={(m) => `/month/${m}`} />
        <Link href={`/month/${next}`} className="text-base opacity-70">
          ›
        </Link>
      </div>
      <AddMovementsButton
        month={month}
        className="ml-auto shadow-[0_8px_24px_rgba(28,27,41,0.18)]"
      />
    </div>
  );
}

export function MonthEmptyHeader({ month }: { month: string }) {
  const current = parseISO(`${month}-01`);
  const prev = format(subMonths(current, 1), "yyyy-MM");
  const next = format(addMonths(current, 1), "yyyy-MM");

  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-3.5">
      <div className="flex items-center gap-3.5">
        <Link href={`/month/${prev}`} className="text-[#6E6B82]">
          ‹
        </Link>
        <MonthHeroNav month={month} navigateTo={(m) => `/month/${m}`} />
        <Link href={`/month/${next}`} className="text-[#6E6B82]">
          ›
        </Link>
      </div>
      <AddMovementsButton month={month} />
    </div>
  );
}
