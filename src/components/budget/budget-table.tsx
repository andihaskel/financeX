"use client";

import { updateBudget } from "@/app/actions/settings";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency/convert";
import { cn } from "@/lib/utils";

interface BudgetRow {
  categoryId: string;
  name: string;
  budget: number;
  actual: number;
}

export function BudgetTable({ data, month }: { data: BudgetRow[]; month: string }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const remaining = row.budget - row.actual;
            const pct = row.budget > 0 ? (row.actual / row.budget) * 100 : 0;
            const status =
              pct > 100 ? "over" : pct >= 80 ? "warning" : "healthy";

            return (
              <TableRow key={row.categoryId}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.budget)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.actual)}</TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    remaining < 0 ? "text-rose-600" : "text-emerald-600"
                  )}
                >
                  {formatCurrency(remaining)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Progress
                      value={Math.min(pct, 100)}
                      className={cn(
                        "h-2",
                        status === "over" && "[&>div]:bg-rose-500",
                        status === "warning" && "[&>div]:bg-amber-500"
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {pct.toFixed(0)}% used ·{" "}
                      {status === "over"
                        ? "Over budget"
                        : status === "warning"
                          ? "Near limit"
                          : "On track"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
