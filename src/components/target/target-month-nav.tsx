"use client";

import { MonthTitlePicker } from "@/components/shared/month-title-picker";

export function TargetMonthNav({ month }: { month: string }) {
  return (
    <MonthTitlePicker
      month={month}
      navigateTo={(nextMonth) => `/target?month=${nextMonth}`}
    />
  );
}
