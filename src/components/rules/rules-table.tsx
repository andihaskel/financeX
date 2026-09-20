"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { deleteRule, updateRule } from "@/app/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategorizationRule, Category } from "@/types/database";

interface RulesTableProps {
  rules: CategorizationRule[];
  categories: Pick<Category, "id" | "name">[];
  usageCounts: Record<string, number>;
}

export function RulesTable({ rules, categories, usageCounts }: RulesTableProps) {
  const [isPending, startTransition] = useTransition();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const result = await updateRule(id, { active: !active });
      if (result.error) toast.error(result.error);
      else window.location.reload();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteRule(id);
      if (result.error) toast.error(result.error);
      else window.location.reload();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pattern</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-sm">{rule.pattern}</TableCell>
              <TableCell>{rule.match_type}</TableCell>
              <TableCell>
                {rule.category_id ? categoryMap.get(rule.category_id) ?? "—" : "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{rule.transaction_type}</Badge>
              </TableCell>
              <TableCell>{rule.priority}</TableCell>
              <TableCell>{usageCounts[rule.id] ?? 0}</TableCell>
              <TableCell>
                <Switch
                  checked={rule.active}
                  onCheckedChange={() => toggleActive(rule.id, rule.active)}
                  disabled={isPending}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(rule.id)}
                  disabled={isPending}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
