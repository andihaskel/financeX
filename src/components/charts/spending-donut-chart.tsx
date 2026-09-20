"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DonutSlice } from "@/lib/spending/donut-slices";
import { formatMoney } from "@/lib/design/format";

export function SpendingDonutChart({
  slices,
  className,
}: {
  slices: DonutSlice[];
  className?: string;
}) {
  const data = slices.filter((slice) => slice.value > 0);
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  if (total <= 0) return null;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            contentStyle={{
              borderRadius: 12,
              border: "none",
              boxShadow: "0 6px 20px rgba(28,27,41,0.12)",
              fontSize: 13,
              fontWeight: 600,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.slice(0, 6).map((slice) => (
          <div key={slice.name} className="flex items-center gap-2 text-xs font-semibold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-[#6E6B82]">{slice.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
