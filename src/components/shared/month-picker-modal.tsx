"use client";

import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthPickerModal({
  open,
  year,
  selectedMonth,
  onSelect,
  onClose,
}: {
  open: boolean;
  year: number;
  selectedMonth: string;
  onSelect: (month: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(28,27,41,0.35)] p-4">
      <div className="w-full max-w-[380px] rounded-[24px] bg-white p-7">
        <h3 className="text-base font-extrabold">Jump to a month</h3>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {MONTHS.map((short, index) => {
            const month = `${year}-${String(index + 1).padStart(2, "0")}`;
            const active = month === selectedMonth;
            return (
              <button
                key={month}
                type="button"
                onClick={() => {
                  onSelect(month);
                  onClose();
                }}
                className={cn(
                  "rounded-[12px] py-2.5 text-[13px] font-bold transition-colors",
                  active
                    ? "bg-[#6C3FD1] text-white"
                    : "bg-[#F3F1F9] text-[#1C1B29] hover:bg-[#E2DEF0]"
                )}
              >
                {short}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-[13px] font-semibold text-[#6E6B82]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
