"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { createAccount, updateCategory, updateIncomeSource, updateSettings } from "@/app/actions/settings";
import { PrimaryButton, SectionTitle, SurfaceCard } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Account, Category, IncomeSource, UserSettings } from "@/types/database";

interface SettingsFormProps {
  section?: string;
  settings: UserSettings | null;
  accounts: Account[];
  categories: Category[];
  incomeSources: IncomeSource[];
}

export function SettingsForm({
  section = "general",
  settings,
  accounts,
  categories,
  incomeSources,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const showGeneral = section === "general";
  const showAccounts = section === "accounts";
  const showCategories = section === "categories";

  return (
    <div className="space-y-6">
      {showGeneral && (
        <>
          <SurfaceCard>
            <SectionTitle infoKey="settings.currency">Currency</SectionTitle>
          <form
            action={(formData) => {
              startTransition(async () => {
                const result = await updateSettings({
                  uyu_to_usd_rate: Number(formData.get("uyu_to_usd_rate")),
                  base_currency: "USD",
                });
                if (result.error) toast.error(result.error);
                else toast.success("Currency settings saved");
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="uyu_to_usd_rate">UYU per 1 USD</Label>
              <Input
                id="uyu_to_usd_rate"
                name="uyu_to_usd_rate"
                type="number"
                step="0.01"
                defaultValue={settings?.uyu_to_usd_rate ?? 40}
              />
              <p className="text-xs text-muted-foreground">
                Default: 40 UYU = 1 USD. Original transaction amounts are never modified.
              </p>
            </div>
            <PrimaryButton type="submit" disabled={isPending} className="mt-2">
              Save currency settings
            </PrimaryButton>
          </form>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle infoKey="settings.savingsTarget">Savings target</SectionTitle>
          <form
            action={(formData) => {
              startTransition(async () => {
                const result = await updateSettings({
                  savings_target_percent: Number(formData.get("savings_target_percent")),
                });
                if (result.error) toast.error(result.error);
                else toast.success("Savings target saved");
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="savings_target_percent">Target savings rate (%)</Label>
              <Input
                id="savings_target_percent"
                name="savings_target_percent"
                type="number"
                step="0.1"
                defaultValue={settings?.savings_target_percent ?? 40}
              />
            </div>
            <PrimaryButton type="submit" disabled={isPending} className="mt-2">
              Save savings target
            </PrimaryButton>
          </form>
          </SurfaceCard>

          <SurfaceCard>
            <SectionTitle infoKey="settings.incomeSources">Income sources</SectionTitle>
            <div className="space-y-4">
          {incomeSources.map((source) => (
            <form
              key={source.id}
              action={(formData) => {
                startTransition(async () => {
                  const result = await updateIncomeSource(source.id, {
                    expected_monthly_amount: Number(formData.get("amount")),
                    active: formData.get("active") === "on",
                  });
                  if (result.error) toast.error(result.error);
                  else toast.success(`${source.name} updated`);
                });
              }}
              className="flex flex-col gap-3 rounded-[16px] border border-[#F1EFF7] p-4 sm:flex-row sm:items-end"
            >
              <div className="flex-1 space-y-2">
                <Label>{source.name}</Label>
                <Input
                  name="amount"
                  type="number"
                  defaultValue={source.expected_monthly_amount}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch name="active" defaultChecked={source.active} />
                <Label>Active</Label>
              </div>
              <PrimaryButton type="submit" disabled={isPending} className="px-4 py-2 text-xs">
                Save
              </PrimaryButton>
            </form>
            ))}
            </div>
          </SurfaceCard>
        </>
      )}

      {showAccounts && (
        <SurfaceCard>
          <SectionTitle infoKey="settings.accounts">Accounts</SectionTitle>
          <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-[16px] border border-[#F1EFF7] p-4">
              <p className="font-bold">{account.name}</p>
              <p className="text-sm font-semibold text-[#6E6B82]">
                {account.institution} · {account.type} · {account.currency}
              </p>
            </div>
          ))}
          <form
            action={(formData) => {
              startTransition(async () => {
                const result = await createAccount({
                  name: String(formData.get("name")),
                  institution: String(formData.get("institution")),
                  type: formData.get("type") as Account["type"],
                  currency: formData.get("currency") as Account["currency"],
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Account created");
                  window.location.reload();
                }
              });
            }}
            className="grid gap-3 rounded-[16px] border border-dashed border-[#E2DEF0] p-4 sm:grid-cols-2"
          >
            <Input name="name" placeholder="Account name" required />
            <Input name="institution" placeholder="Institution" required />
            <Select name="type" defaultValue="bank_account">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_account">Bank account</SelectItem>
                <SelectItem value="credit_card">Credit card</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
            <Select name="currency" defaultValue="USD">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="UYU">UYU</SelectItem>
              </SelectContent>
            </Select>
            <PrimaryButton type="submit" className="sm:col-span-2" disabled={isPending}>
              Add account
            </PrimaryButton>
          </form>
          </div>
        </SurfaceCard>
      )}

      {showCategories && (
        <SurfaceCard>
          <SectionTitle infoKey="settings.categories">Categories</SectionTitle>
          <div className="space-y-3">
          {categories.map((category) => (
            <form
              key={category.id}
              action={(formData) => {
                startTransition(async () => {
                  const result = await updateCategory(category.id, {
                    group: formData.get("group") as Category["group"],
                    active: formData.get("active") === "on",
                  });
                  if (result.error) toast.error(result.error);
                  else toast.success(`${category.name} updated`);
                });
              }}
              className="flex flex-col gap-3 rounded-[16px] border border-[#F1EFF7] p-4 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <p className="font-medium">{category.name}</p>
              </div>
              <Select name="group" defaultValue={category.group}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="discretionary">Discretionary</SelectItem>
                  <SelectItem value="extraordinary">Extraordinary</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch name="active" defaultChecked={category.active} />
                <Label>Active</Label>
              </div>
              <PrimaryButton type="submit" disabled={isPending} className="px-4 py-2 text-xs">
                Save
              </PrimaryButton>
            </form>
          ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
