"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createAccount } from "@/app/actions/settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountType, Currency } from "@/types/database";

export function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("bank_account");
  const [currency, setCurrency] = useState<Currency>("USD");

  function resetForm() {
    setName("");
    setInstitution("");
    setType("bank_account");
    setCurrency("USD");
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedInstitution = institution.trim();

    if (!trimmedName) {
      toast.error("Account name is required");
      return;
    }
    if (!trimmedInstitution) {
      toast.error("Institution is required");
      return;
    }

    startTransition(async () => {
      const result = await createAccount({
        name: trimmedName,
        institution: trimmedInstitution,
        type,
        currency,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`${trimmedName} added`);
      resetForm();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-extrabold">Add account</DialogTitle>
          <DialogDescription className="text-sm font-semibold text-[#6E6B82]">
            For imports — Ontop, Santander, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="add-account-name">Account name</Label>
            <Input
              id="add-account-name"
              value={name}
              disabled={isPending}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ontop USD"
              className="rounded-[12px] border-[#E2DEF0]"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="add-account-institution">Institution</Label>
            <Input
              id="add-account-institution"
              value={institution}
              disabled={isPending}
              onChange={(event) => setInstitution(event.target.value)}
              placeholder="Ontop"
              className="rounded-[12px] border-[#E2DEF0]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-account-type">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType((value ?? "bank_account") as AccountType)}
            >
              <SelectTrigger id="add-account-type" className="w-full" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_account">Bank account</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-account-currency">Currency</Label>
            <Select
              value={currency}
              onValueChange={(value) => setCurrency((value ?? "USD") as Currency)}
            >
              <SelectTrigger id="add-account-currency" className="w-full" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="UYU">UYU</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-[14px] px-4 py-2 text-sm font-bold text-[#6E6B82]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-[14px] bg-[#6C3FD1] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Add account"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddAccountButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E2DEF0] bg-white px-4 py-2 text-sm font-bold text-[#6C3FD1] shadow-[0_2px_8px_rgba(28,27,41,0.06)] transition-colors hover:bg-[#FAF9FC]"
        }
      >
        + Add account
      </button>
      <AddAccountDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
