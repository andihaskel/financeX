"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatTransactionAmount } from "@/lib/design/format";
import {
  getIncomeInterestAmount,
  getPaymentTotal,
} from "@/lib/accounting/income-wealth";
import type { Currency } from "@/types/database";

export interface WealthPositionOption {
  id: string;
  name: string;
}

export function IncomeWealthLinkPicker({
  wealthPositionId,
  principalAmount,
  onWealthPositionChange,
  onPrincipalChange,
  paymentAmount,
  paymentCurrency,
  wealthPositions,
  disabled,
}: {
  wealthPositionId: string;
  principalAmount: string;
  onWealthPositionChange: (value: string) => void;
  onPrincipalChange: (value: string) => void;
  paymentAmount: number;
  paymentCurrency: Currency;
  wealthPositions: WealthPositionOption[];
  disabled?: boolean;
}) {
  const total = getPaymentTotal(paymentAmount);
  const principal = Number(principalAmount.replace(/,/g, ""));
  const principalValid = Number.isFinite(principal) && principal >= 0 && principal <= total;
  const interest = getIncomeInterestAmount({
    amount: paymentAmount,
    income_principal_amount: principalValid ? principal : 0,
  });

  return (
    <div className="mt-4 space-y-3 rounded-[16px] border border-[#F1EFF7] bg-[#FAF9FC] p-4">
      <div>
        <p className="text-sm font-extrabold text-[#1C1B29]">Fixed income split</p>
        <p className="mt-1 text-xs font-semibold text-[#6E6B82]">
          Link this payment to a wealth position. Capital repaid reduces the position; only
          interest counts as monthly income.
        </p>
      </div>

      {wealthPositions.length === 0 ? (
        <p className="text-xs font-semibold text-[#6E6B82]">
          Add a wealth position first (e.g. renta fija / loan outstanding).
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="income-wealth-position">Wealth position</Label>
        <Select
          value={wealthPositionId || "none"}
          onValueChange={(next) => onWealthPositionChange(next === "none" ? "" : (next ?? ""))}
        >
          <SelectTrigger id="income-wealth-position" className="w-full" disabled={disabled}>
            <SelectValue placeholder="No link" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No link</SelectItem>
            {wealthPositions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {wealthPositionId ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="income-principal-amount">Capital portion</Label>
            <Input
              id="income-principal-amount"
              inputMode="decimal"
              value={principalAmount}
              disabled={disabled}
              onChange={(event) => onPrincipalChange(event.target.value)}
              placeholder="0"
              className="rounded-[12px] border-[#E2DEF0] bg-white"
            />
            <p className="text-xs font-semibold text-[#6E6B82]">
              Payment total: {formatTransactionAmount(paymentAmount, paymentCurrency)}
            </p>
          </div>

          <div className="rounded-[12px] bg-white px-3.5 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-[#6E6B82]">Counts as income</span>
              <span className="text-sm font-extrabold tabular-nums text-[#6C3FD1]">
                {formatTransactionAmount(interest, paymentCurrency)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-[#6E6B82]">Reduces position</span>
              <span className="text-sm font-extrabold tabular-nums">
                {formatTransactionAmount(principalValid ? principal : 0, paymentCurrency)}
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
