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
import { useIncognito } from "@/lib/privacy/incognito-context";

export function WealthAllocationDonut({
  slices,
  totalUsd,
  className,
}: {
  slices: DonutSlice[];
  totalUsd: number;
  className?: string;
}) {
  const data = slices.filter((slice) => slice.value > 0);
  const sliceTotal = data.reduce((sum, slice) => sum + slice.value, 0);
  const { incognito } = useIncognito();

  if (sliceTotal <= 0) return null;

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-[220px]">
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
              itemStyle={incognito ? { filter: "blur(7px)", userSelect: "none" } : undefined}
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9E9AB0]">
            Net worth
          </p>
          <p
            className="text-sm font-extrabold tabular-nums text-[#1C1B29]"
            style={incognito ? { filter: "blur(7px)", userSelect: "none" } : undefined}
          >
            {formatMoney(totalUsd)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {data.map((slice) => {
          const pct = sliceTotal > 0 ? (slice.value / sliceTotal) * 100 : 0;
          return (
            <div
              key={slice.name}
              className="flex items-center justify-between gap-3 text-xs font-semibold"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[#6E6B82]">{slice.name}</span>
              </div>
              <div
                className="shrink-0 tabular-nums text-[#1C1B29]"
                style={incognito ? { filter: "blur(7px)", userSelect: "none" } : undefined}
              >
                <span>{pct.toFixed(0)}%</span>
                <span className="ml-2 text-[#9E9AB0]">{formatMoney(slice.value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
