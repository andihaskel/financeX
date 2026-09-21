"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Loader2, Search } from "lucide-react";

import {
  searchExpensesForRefundLink,
  type RefundLinkExpense,
} from "@/app/actions/transactions";
import { Input } from "@/components/ui/input";
import {
  getAccountDisplayName,
  isBankAccountType,
  isCreditCardType,
} from "@/lib/accounts/helpers";
import { categoriesForTransactionType } from "@/lib/categories/helpers";
import { formatTransactionAmount } from "@/lib/design/format";
import type { Account, Category } from "@/types/database";
import { cn } from "@/lib/utils";

type PickerStep = "quick" | "browse";
type AccountTypeFilter = "" | "bank" | "credit_card" | "cash" | "investment";

const ACCOUNT_TYPE_OPTIONS: { value: AccountTypeFilter; label: string }[] = [
  { value: "", label: "All account types" },
  { value: "bank", label: "Bank accounts" },
  { value: "credit_card", label: "Credit cards" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
];

function matchesAccountType(account: Account, filter: AccountTypeFilter) {
  if (!filter) return true;
  if (filter === "bank") return isBankAccountType(account.type);
  if (filter === "credit_card") return isCreditCardType(account.type);
  return account.type === filter;
}

function ExpenseRow({
  expense,
  selected,
  onSelect,
  disabled,
}: {
  expense: RefundLinkExpense;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors disabled:opacity-50",
        selected
          ? "bg-[#F3EDFF] ring-1 ring-[#C4B5FD]"
          : "hover:bg-[#F8F7FB]"
      )}
    >
      <span className="shrink-0 pt-0.5 text-xs font-bold text-[#6E6B82]">
        {format(parseISO(expense.transaction_date), "MMM d, yyyy")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#1C1B29]">
          {expense.description}
        </span>
        <span className="block text-xs font-semibold text-[#6E6B82]">
          {formatTransactionAmount(expense.amount, expense.currency)}
        </span>
      </span>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#9E9AB0]">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[12px] border border-[#E2DEF0] bg-[#FAF9FC] px-3 py-2.5 text-sm font-semibold text-[#1C1B29] outline-none focus:border-[#6C3FD1]"
      >
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ExpenseResults({
  loading,
  expenses,
  value,
  emptyMessage,
  onSelect,
  disabled,
}: {
  loading: boolean;
  expenses: RefundLinkExpense[];
  value: string;
  emptyMessage: string;
  onSelect: (expense: RefundLinkExpense) => void;
  disabled?: boolean;
}) {
  return (
    <div className="max-h-52 overflow-y-auto rounded-[13px] border border-[#E2DEF0] bg-white">
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-[#6E6B82]">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : expenses.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm font-semibold text-[#6E6B82]">
          {emptyMessage}
        </p>
      ) : (
        <div className="p-1.5">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              selected={value === expense.id}
              disabled={disabled}
              onSelect={() => onSelect(expense)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RefundExpenseLinkPicker({
  value,
  onChange,
  accountId,
  refundId,
  refundDate,
  accounts,
  categories,
  disabled,
  active,
}: {
  value: string;
  onChange: (next: string) => void;
  accountId: string;
  refundId: string;
  refundDate: string;
  accounts: Account[];
  categories: Category[];
  disabled?: boolean;
  active: boolean;
}) {
  const [step, setStep] = useState<PickerStep>("quick");
  const [selectedExpense, setSelectedExpense] = useState<RefundLinkExpense | null>(null);
  const [quickExpenses, setQuickExpenses] = useState<RefundLinkExpense[]>([]);
  const [browseExpenses, setBrowseExpenses] = useState<RefundLinkExpense[]>([]);
  const [browseTruncated, setBrowseTruncated] = useState(false);
  const [quickLoadedKey, setQuickLoadedKey] = useState<string | null>(null);
  const [browseLoadedKey, setBrowseLoadedKey] = useState<string | null>(null);

  const [browseMonth, setBrowseMonth] = useState(() => refundDate.slice(0, 7));
  const [browseAccountType, setBrowseAccountType] = useState<AccountTypeFilter>("");
  const [browseAccountId, setBrowseAccountId] = useState(accountId);
  const [browseCategoryId, setBrowseCategoryId] = useState("");
  const [browseQuery, setBrowseQuery] = useState("");
  const [debouncedBrowseQuery, setDebouncedBrowseQuery] = useState("");

  const expenseCategories = useMemo(
    () => categoriesForTransactionType(categories, "expense"),
    [categories]
  );

  const filteredAccounts = useMemo(
    () => accounts.filter((account) => matchesAccountType(account, browseAccountType)),
    [accounts, browseAccountType]
  );

  const browseAccountIds = useMemo(() => {
    if (browseAccountId) return [browseAccountId];
    return filteredAccounts.map((account) => account.id);
  }, [browseAccountId, filteredAccounts]);

  const browseRequestKey = [
    browseMonth,
    browseAccountType,
    browseAccountId,
    browseCategoryId,
    debouncedBrowseQuery,
  ].join("|");

  useEffect(() => {
    if (!active || step !== "browse") return;
    const timer = window.setTimeout(() => setDebouncedBrowseQuery(browseQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [active, browseQuery, step]);

  useEffect(() => {
    if (!active || step !== "quick" || !/^\d{4}-\d{2}-\d{2}$/.test(refundDate)) return;

    let cancelled = false;
    const requestKey = `${refundDate}|${accountId}|${value}`;

    void searchExpensesForRefundLink({
      refundId,
      accountId,
      date: refundDate,
      linkedExpenseId: value || null,
    }).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setQuickLoadedKey(requestKey);
        return;
      }
      setQuickExpenses(result.expenses ?? []);
      setQuickLoadedKey(requestKey);
      if (value) {
        const linked = result.expenses?.find((expense) => expense.id === value);
        if (linked) setSelectedExpense(linked);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [active, accountId, refundDate, refundId, step, value]);

  useEffect(() => {
    if (!active || step !== "browse" || browseAccountIds.length === 0) return;

    let cancelled = false;

    void searchExpensesForRefundLink({
      refundId,
      accountIds: browseAccountIds,
      month: browseMonth,
      categoryId: browseCategoryId || undefined,
      query: debouncedBrowseQuery || undefined,
      linkedExpenseId: value || null,
    }).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setBrowseLoadedKey(browseRequestKey);
        return;
      }
      setBrowseExpenses(result.expenses ?? []);
      setBrowseTruncated(result.truncated ?? false);
      setBrowseLoadedKey(browseRequestKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    active,
    browseAccountIds,
    browseCategoryId,
    browseMonth,
    browseRequestKey,
    debouncedBrowseQuery,
    refundId,
    step,
    value,
  ]);

  const quickLoading =
    active && step === "quick" && quickLoadedKey !== `${refundDate}|${accountId}|${value}`;
  const browseLoading = active && step === "browse" && browseLoadedKey !== browseRequestKey;

  function selectExpense(expense: RefundLinkExpense) {
    setSelectedExpense(expense);
    onChange(expense.id);
    setStep("quick");
  }

  function clearLink() {
    setSelectedExpense(null);
    onChange("");
  }

  const selectedSummary =
    selectedExpense ??
    (value
      ? quickExpenses.find((expense) => expense.id === value) ??
        browseExpenses.find((expense) => expense.id === value) ??
        null
      : null);

  if (step === "browse") {
    return (
      <div className="mt-4 border-t border-[#F1EFF7] pt-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setStep("quick")}
          className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-[#6C3FD1] disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>

        <h3 className="mb-3 text-sm font-extrabold text-[#1C1B29]">Find original expense</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[#9E9AB0]">
              Month
            </span>
            <input
              type="month"
              value={browseMonth}
              disabled={disabled}
              onChange={(event) => setBrowseMonth(event.target.value)}
              className="w-full rounded-[12px] border border-[#E2DEF0] bg-[#FAF9FC] px-3 py-2.5 text-sm font-semibold text-[#1C1B29] outline-none focus:border-[#6C3FD1]"
            />
          </label>

          <FilterSelect
            label="Account type"
            value={browseAccountType}
            disabled={disabled}
            onChange={(next) => {
              setBrowseAccountType(next as AccountTypeFilter);
              setBrowseAccountId("");
            }}
            options={ACCOUNT_TYPE_OPTIONS}
          />

          <FilterSelect
            label="Account"
            value={browseAccountId}
            disabled={disabled}
            onChange={setBrowseAccountId}
            options={[
              { value: "", label: "All matching accounts" },
              ...filteredAccounts.map((account) => ({
                value: account.id,
                label: getAccountDisplayName(account),
              })),
            ]}
          />

          <FilterSelect
            label="Category"
            value={browseCategoryId}
            disabled={disabled}
            onChange={setBrowseCategoryId}
            options={[
              { value: "", label: "All categories" },
              ...expenseCategories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9E9AB0]" />
          <Input
            value={browseQuery}
            onChange={(event) => setBrowseQuery(event.target.value)}
            disabled={disabled}
            placeholder="Search by description…"
            className="h-11 rounded-[13px] border-[#E2DEF0] bg-[#FAF9FC] pl-9 text-sm font-semibold text-[#1C1B29] placeholder:font-semibold placeholder:text-[#9E9AB0] focus-visible:border-[#6C3FD1] focus-visible:ring-[#6C3FD1]/20"
          />
        </div>

        <div className="mt-3">
          <ExpenseResults
            loading={browseLoading}
            expenses={browseExpenses}
            value={value}
            disabled={disabled}
            emptyMessage={
              browseAccountIds.length === 0
                ? "No accounts match this account type."
                : "No expenses match these filters."
            }
            onSelect={selectExpense}
          />
        </div>

        <p className="mt-2 text-xs font-semibold text-[#6E6B82]">
          {browseTruncated
            ? "Showing the first 50 matches. Narrow month, account, or search text."
            : "Pick the expense this refund belongs to."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-[#F1EFF7] pt-4">
      <label className="mb-2 block text-[13px] font-semibold text-[#6E6B82]">
        Link to original expense (optional)
      </label>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={clearLink}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50",
            !value
              ? "bg-[#6C3FD1] text-white"
              : "bg-[#F3F1F9] text-[#6E6B82] hover:bg-[#ECE9F5]"
          )}
        >
          Count in refund month (cash)
        </button>
      </div>

      {selectedSummary && value && (
        <div className="mb-3 rounded-[12px] bg-[#F3EDFF] px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#6C3FD1]">
            Linked expense
          </p>
          <p className="mt-1 text-sm font-bold text-[#1C1B29]">{selectedSummary.description}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#6E6B82]">
            {format(parseISO(selectedSummary.transaction_date), "MMM d, yyyy")} ·{" "}
            {formatTransactionAmount(selectedSummary.amount, selectedSummary.currency)}
          </p>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold text-[#6E6B82]">
        Expenses on{" "}
        {/^\d{4}-\d{2}-\d{2}$/.test(refundDate)
          ? format(parseISO(refundDate), "MMM d, yyyy")
          : "this date"}{" "}
        in this account
      </p>

      <ExpenseResults
        loading={quickLoading}
        expenses={quickExpenses.filter((expense) => expense.id !== value)}
        value={value}
        disabled={disabled}
        emptyMessage="No expenses on this date in this account."
        onSelect={selectExpense}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setStep("browse")}
        className="mt-3 w-full rounded-[13px] border border-[#E2DEF0] bg-[#FAF9FC] px-4 py-3 text-sm font-bold text-[#6C3FD1] transition-colors hover:bg-[#F3EDFF] disabled:opacity-50"
      >
        Find another expense…
      </button>

      <p className="mt-2 text-xs font-semibold text-[#6E6B82]">
        Linked refunds reduce spending in the expense month instead of the refund month.
      </p>
    </div>
  );
}
