"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CategoryChartProps {
  data: { name: string; amount: number }[];
}

export function SpendingByCategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No spending data for this month
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => [`$${Number(value).toFixed(0)}`, "Spent"]} />
        <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface BudgetChartProps {
  data: { name: string; budget: number; actual: number }[];
}

export function BudgetVsActualChart({ data }: BudgetChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No budget data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} />
        <Legend />
        <Bar dataKey="budget" fill="hsl(var(--chart-1))" name="Budget" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" fill="hsl(var(--chart-3))" name="Actual" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CompositionChartProps {
  data: { name: string; value: number }[];
}

export function CompositionBarChart({ data, title }: CompositionChartProps & { title?: string }) {
  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} />
        <Bar dataKey="value" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TrendChartProps {
  data: { month: string; income: number; expenses: number; savings: number }[];
}

export function MonthlyTrendChart({ data }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Trend appears after multiple months of data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
        <Tooltip formatter={(value) => `$${Number(value).toFixed(0)}`} />
        <Legend />
        <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" strokeWidth={2} />
        <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-5))" strokeWidth={2} />
        <Line type="monotone" dataKey="savings" stroke="hsl(var(--chart-3))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
