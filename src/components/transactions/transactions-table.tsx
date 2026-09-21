"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { convertToUsd, formatCurrency } from "@/lib/currency/convert";
import type { TransactionWithRelations } from "@/types/database";

interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  uyuToUsdRate: number;
  month: string;
  filters: Record<string, string | undefined>;
}

export function TransactionsTable({
  transactions,
  uyuToUsdRate,
}: TransactionsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead className="text-right">USD</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const usd = convertToUsd(tx.amount, tx.currency, uyuToUsdRate);
            return (
              <TableRow key={tx.id}>
                <TableCell className="whitespace-nowrap">{tx.transaction_date}</TableCell>
                <TableCell className="max-w-[240px] truncate">{tx.description}</TableCell>
                <TableCell>{tx.accounts?.name ?? "—"}</TableCell>
                <TableCell>{tx.categories?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tx.transaction_type}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(tx.amount, tx.currency)}
                </TableCell>
                <TableCell>{tx.currency}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatCurrency(usd)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{tx.categorization_status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function TransactionFilters({
  month,
  accounts,
  categories,
  filters,
}: {
  month: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  filters: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link href={`/transactions?month=${month}`} className="text-muted-foreground hover:underline">
        Clear filters
      </Link>
    </div>
  );
}
