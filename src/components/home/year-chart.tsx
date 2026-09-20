"use client";

import type { MonthSummary } from "@/lib/queries/year";

export function YearChart({ months }: { months: MonthSummary[] }) {
  const dataMonths = months.filter((m) => m.hasData);
  const max = Math.max(...dataMonths.map((m) => m.income), 1);

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-5 text-[13px] font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D8D4E8]" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> Spending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" /> Savings
        </span>
      </div>
      <div className="flex h-[150px] items-end gap-2">
        {months.map((m) => {
          const incomeH = m.hasData ? Math.round((m.income / max) * 130) : 2;
          const spentH = m.hasData ? Math.round((m.spent / max) * 130) : 2;
          const savedH = m.hasData ? Math.round((m.saved / max) * 130) : 2;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-[130px] w-full items-end gap-0.5">
                <div
                  className="flex-1 rounded-t bg-[#EDEAF7]"
                  style={{ height: incomeH }}
                />
                <div
                  className="flex-1 rounded-t bg-[#EDD9D9]"
                  style={{ height: spentH }}
                />
                <div
                  className="flex-1 rounded-t bg-[#C4B5F0]"
                  style={{ height: savedH }}
                />
              </div>
              <span
                className={`text-[11px] font-semibold ${m.hasData ? "text-[#6E6B82]" : "text-[#C7C3D6]"}`}
              >
                {m.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
