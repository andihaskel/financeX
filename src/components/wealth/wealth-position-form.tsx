"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WEALTH_KIND_OPTIONS } from "@/lib/wealth/helpers";
import type { Account, Currency, WealthPositionKind } from "@/types/database";

export interface WealthPositionFormValues {
  name: string;
  kind: WealthPositionKind;
  amount: number;
  currency: Currency;
  accountId: string | null;
  notes: string | null;
}

export function WealthPositionForm({
  formId,
  accounts,
  initialValues,
  onSubmit,
}: {
  formId: string;
  accounts: Account[];
  initialValues?: Partial<WealthPositionFormValues>;
  onSubmit: (values: WealthPositionFormValues) => void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [kind, setKind] = useState<WealthPositionKind>(initialValues?.kind ?? "other");
  const [amount, setAmount] = useState(
    initialValues?.amount !== undefined ? String(initialValues.amount) : "0"
  );
  const [currency, setCurrency] = useState<Currency>(initialValues?.currency ?? "USD");
  const [accountId, setAccountId] = useState(initialValues?.accountId ?? "none");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          name: name.trim(),
          kind,
          amount: Number(amount),
          currency,
          accountId: accountId === "none" ? null : accountId,
          notes: notes.trim() || null,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor={`${formId}-name`}>Name</Label>
        <Input
          id={`${formId}-name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Emergency fund, Brokerage…"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-kind`}>Type</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as WealthPositionKind)}>
            <SelectTrigger id={`${formId}-kind`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEALTH_KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-account`}>Linked account</Label>
          <Select
            value={accountId}
            onValueChange={(value) => setAccountId(value ?? "none")}
          >
            <SelectTrigger id={`${formId}-account`} className="w-full">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-amount`}>Balance</Label>
          <Input
            id={`${formId}-amount`}
            type="number"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${formId}-currency`}>Currency</Label>
          <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
            <SelectTrigger id={`${formId}-currency`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="UYU">UYU</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${formId}-notes`}>Notes</Label>
        <Textarea
          id={`${formId}-notes`}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional — e.g. not imported, old savings"
        />
      </div>
    </form>
  );
}
