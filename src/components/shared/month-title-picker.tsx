"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  formatMonthLabel,
  MonthPickerModal,
} from "@/components/shared/month-picker-modal";

export function MonthTitlePicker({
  month,
  navigateTo,
}: {
  month: string;
  navigateTo: (month: string) => string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const year = Number(month.slice(0, 4));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[12px] bg-white px-4 py-2.5 text-[13px] font-bold shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
      >
        {formatMonthLabel(month)} ▾
      </button>
      <MonthPickerModal
        open={open}
        year={year}
        selectedMonth={month}
        onSelect={(m) => router.push(navigateTo(m))}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function MonthHeroNav({
  month,
  navigateTo,
}: {
  month: string;
  navigateTo: (month: string) => string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const year = Number(month.slice(0, 4));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-[22px] font-extrabold"
      >
        {formatMonthLabel(month)}
      </button>
      <MonthPickerModal
        open={open}
        year={year}
        selectedMonth={month}
        onSelect={(m) => router.push(navigateTo(m))}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
