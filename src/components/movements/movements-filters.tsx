"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MonthTitlePicker } from "@/components/shared/month-title-picker";
import { AddMovementsButton } from "@/components/layout/floating-add-button";
import { PageTitleWithInfo } from "@/components/ui/surface";
import { getAccountDisplayName } from "@/lib/accounts/helpers";
import {
  categoriesForTransactionType,
  typeNeedsCategory,
} from "@/lib/categories/helpers";
import { getMovementsBackTarget } from "@/lib/navigation/return-to";
import {
  buildTransferDestinationOptions,
  transferDestinationFilterLabel,
  type TransferDestinationValue,
} from "@/lib/wealth/transfer-destination-values";
import type { Account, Category, TransactionType } from "@/types/database";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "refund", label: "Refund" },
  { value: "credit_card_payment", label: "Card payment" },
];

const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
];

export type MovementsSort = "date" | "amount";

export type MovementsFilterValues = {
  account: string;
  category: string;
  type: string;
  transferTo: TransferDestinationValue;
  extraordinary: string;
  q: string;
  sort: MovementsSort;
};

export function MovementsFilters({
  month,
  year,
  accounts,
  categories,
  wealthPositions,
  filters,
  onFilterChange,
}: {
  month: string;
  year?: string;
  accounts: Account[];
  categories: Category[];
  wealthPositions: { id: string; name: string }[];
  filters: MovementsFilterValues;
  onFilterChange: (key: keyof MovementsFilterValues, value: string) => void;
}) {
  const searchParams = useSearchParams();
  const viewingYear = Boolean(year);
  const from = searchParams.get("from") ?? undefined;
  const backTarget = getMovementsBackTarget(
    viewingYear ? { year, from } : { month, from }
  );

  const selectedType = (filters.type ?? "") as TransactionType | "";
  const categoryOptions =
    selectedType && typeNeedsCategory(selectedType)
      ? categoriesForTransactionType(categories, selectedType)
      : categories;

  const categoryLabel =
    categories.find((c) => c.id === filters.category)?.name ?? "Category";
  const typeLabel =
    TYPE_OPTIONS.find((t) => t.value === (filters.type ?? ""))?.label ?? "Type";
  const sortLabel =
    SORT_OPTIONS.find((s) => s.value === filters.sort)?.label ?? "Date";
  const transferOptions = [
    { value: "", label: "All destinations" },
    ...buildTransferDestinationOptions(accounts, wealthPositions).map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];
  const transferLabel = filters.transferTo
    ? `${transferDestinationFilterLabel(filters.transferTo, accounts, wealthPositions)} ▾`
    : "Transfer to ▾";

  return (
    <div className="space-y-3.5">
      {backTarget && (
        <Link
          href={backTarget.href}
          className="inline-flex items-center text-sm font-bold text-[#6E6B82] transition-colors hover:text-[#6C3FD1]"
        >
          ‹ {backTarget.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2.5">
        <PageTitleWithInfo title="Movements" infoKey="movements.page" className="sm:mr-auto" />
        <div className="flex flex-wrap items-center gap-2.5">
          {viewingYear ? (
            <span className="text-[15px] font-bold text-[#6E6B82]">{year}</span>
          ) : (
            <MonthTitlePicker
              month={month}
              navigateTo={(m) => {
                const params = new URLSearchParams(
                  typeof window !== "undefined"
                    ? window.location.search
                    : searchParams.toString()
                );
                params.set("month", m);
                params.delete("year");
                params.delete("from");
                params.delete("show");
                params.delete("page");
                params.delete("limit");
                return `/movements?${params.toString()}`;
              }}
            />
          )}
          <AddMovementsButton month={viewingYear ? undefined : month} />
        </div>
      </div>

      <input
        type="search"
        placeholder="Search movements..."
        value={filters.q}
        className="w-full rounded-[14px] bg-white px-[18px] py-3 text-sm font-semibold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)] outline-none placeholder:text-[#6E6B82] focus:ring-2 focus:ring-[#6C3FD1]/30"
        onChange={(e) => onFilterChange("q", e.target.value)}
      />

      <div className="flex gap-0.5 overflow-x-auto rounded-full bg-[#EDEAF7] p-1">
        <FilterChip
          active={!filters.account}
          onClick={() => onFilterChange("account", "")}
          label="All"
        />
        {accounts.map((account) => (
          <FilterChip
            key={account.id}
            active={filters.account === account.id}
            onClick={() => onFilterChange("account", account.id)}
            label={getAccountDisplayName(account)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <FilterDropdown
          label={`${typeLabel} ▾`}
          value={filters.type ?? ""}
          onChange={(value) => onFilterChange("type", value)}
          options={TYPE_OPTIONS}
        />
        <FilterDropdown
          label={`${categoryLabel} ▾`}
          value={filters.category ?? ""}
          onChange={(value) => onFilterChange("category", value)}
          options={[
            { value: "", label: "All categories" },
            ...categoryOptions.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <FilterDropdown
          label={`Sort: ${sortLabel} ▾`}
          value={filters.sort}
          onChange={(value) => onFilterChange("sort", value)}
          options={SORT_OPTIONS}
        />
        <FilterDropdown
          label={transferLabel}
          value={filters.transferTo ?? ""}
          onChange={(value) => onFilterChange("transferTo", value)}
          options={transferOptions}
        />
        <button
          type="button"
          aria-pressed={filters.extraordinary === "yes"}
          onClick={() =>
            onFilterChange(
              "extraordinary",
              filters.extraordinary === "yes" ? "" : "yes"
            )
          }
          className={cn(
            "rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors",
            filters.extraordinary === "yes"
              ? "bg-[#6C3FD1] text-white shadow-[0_2px_8px_rgba(108,63,209,0.35)]"
              : "bg-white text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)] hover:text-[#1C1B29]"
          )}
        >
          Extraordinary
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
        active
          ? "bg-white text-[#1C1B29] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
          : "bg-transparent text-[#6E6B82] hover:text-[#1C1B29]"
      )}
    >
      {label}
    </button>
  );
}

function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="inline-block rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#6E6B82] shadow-[0_2px_8px_rgba(28,27,41,0.06)]">
        {label}
      </span>
    </div>
  );
}
