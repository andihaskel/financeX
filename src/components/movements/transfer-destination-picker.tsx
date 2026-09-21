"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildTransferDestinationOptions,
  type TransferDestinationValue,
} from "@/lib/wealth/transfer-destination-values";
import type { Account } from "@/types/database";

export interface WealthPositionOption {
  id: string;
  name: string;
}

export function TransferDestinationPicker({
  value,
  onChange,
  sourceAccountId,
  accounts,
  wealthPositions,
  disabled,
}: {
  value: TransferDestinationValue;
  onChange: (value: TransferDestinationValue) => void;
  sourceAccountId: string;
  accounts: Account[];
  wealthPositions: WealthPositionOption[];
  disabled?: boolean;
}) {
  const options = buildTransferDestinationOptions(
    accounts,
    wealthPositions,
    sourceAccountId
  );
  const groups = [...new Set(options.map((option) => option.group))];

  return (
    <div className="mt-4 space-y-3 rounded-[16px] border border-[#F1EFF7] bg-[#FAF9FC] p-4">
      <div>
        <p className="text-sm font-extrabold text-[#1C1B29]">Transfer destination</p>
        <p className="mt-1 text-xs font-semibold text-[#6E6B82]">
          Pick another account, a wealth position, or mark money that left your tracked
          system. Wealth positions are balances you track manually — not import accounts.
        </p>
      </div>

      {wealthPositions.length === 0 ? (
        <p className="text-xs font-semibold text-[#6E6B82]">
          No wealth positions yet. Add them in Wealth to link transfers like broker or cash
          stash.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="transfer-destination">Where did this money go?</Label>
        <Select
          value={value || "unset"}
          onValueChange={(next) => onChange((next ?? "unset") as TransferDestinationValue)}
        >
          <SelectTrigger id="transfer-destination" className="w-full" disabled={disabled}>
            <SelectValue placeholder="Choose destination" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
