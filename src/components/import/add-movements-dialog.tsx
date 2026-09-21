"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  fetchMonthImportCoverage,
  parseUploadedFiles,
  processImport,
  type ParsedFilePreview,
} from "@/app/actions/import";
import { createManualTransaction } from "@/app/actions/transactions";
import { useImportDialog } from "@/components/import/import-dialog-store";
import {
  formatMonthLabel,
  formatMonthNameOnly,
  MonthPickerModal,
} from "@/components/shared/month-picker-modal";
import { PrimaryButton } from "@/components/ui/surface";
import {
  accountsForImportSelection,
  defaultAccountForPreview,
  dedupeAccounts,
  getAccountDisplayName,
} from "@/lib/accounts/helpers";
import { getCategoryVisual } from "@/lib/design/theme";
import {
  formatMonthsCoveredLabel,
  formatStatementDateRange,
} from "@/lib/import/statement-months";
import { buildMovementsHref } from "@/lib/navigation/return-to";
import type { MonthImportCoverage } from "@/lib/queries/import-coverage";
import type { Account, Category, Currency, TransactionType } from "@/types/database";
import { cn } from "@/lib/utils";
import {
  categoriesForTransactionType,
  typeNeedsCategory,
} from "@/lib/categories/helpers";

type ImportStep = "choose" | "manual" | "result" | "done";

const MANUAL_TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "credit_card_payment", label: "Card payment" },
  { value: "refund", label: "Refund" },
];

const CURRENCY_OPTIONS: Currency[] = ["USD", "UYU"];

function defaultCurrencyForAccount(
  accounts: Account[],
  accountId: string
): Currency {
  return accounts.find((account) => account.id === accountId)?.currency ?? "USD";
}

interface ImportResult {
  totalImported: number;
  totalSkipped: number;
  totalReview: number;
  totalToConfirm?: number;
  totalAuto: number;
  totalSuggested?: number;
  redirectTo?: string;
  monthsCovered: string[];
  monthsUpdated: string[];
  coverage: MonthImportCoverage | null;
}

export function AddMovementsDialog({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const { isOpen, month, accountId: preferredAccountId, close } = useImportDialog();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<ImportStep>("choose");
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState(month ?? format(new Date(), "yyyy-MM"));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previews, setPreviews] = useState<ParsedFilePreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [accountSelections, setAccountSelections] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [manualDescription, setManualDescription] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [manualType, setManualType] = useState<TransactionType>("expense");
  const [manualCategoryId, setManualCategoryId] = useState(categories[0]?.id ?? "");
  const [manualAccountId, setManualAccountId] = useState(
    preferredAccountId && accounts.some((account) => account.id === preferredAccountId)
      ? preferredAccountId
      : (accounts[0]?.id ?? "")
  );
  const [manualCurrency, setManualCurrency] = useState<Currency>(() =>
    defaultCurrencyForAccount(
      accounts,
      preferredAccountId && accounts.some((account) => account.id === preferredAccountId)
        ? preferredAccountId
        : (accounts[0]?.id ?? "")
    )
  );
  const [dragging, setDragging] = useState(false);
  const [createdMonth, setCreatedMonth] = useState<string | null>(null);

  const [year] = targetMonth.split("-").map(Number);
  const monthLabel = formatMonthLabel(targetMonth);
  const monthNameOnly = formatMonthNameOnly(targetMonth);
  const canonicalAccounts = dedupeAccounts(accounts);

  useEffect(() => {
    if (month) setTargetMonth(month);
  }, [month]);

  useEffect(() => {
    if (!isOpen) return;
    setCreatedMonth(null);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      setTargetMonth(month);
    } else {
      setTargetMonth(format(new Date(), "yyyy-MM"));
    }
  }, [isOpen, month]);

  useEffect(() => {
    if (!isOpen) return;
    if (preferredAccountId && accounts.some((account) => account.id === preferredAccountId)) {
      setManualAccountId(preferredAccountId);
      setManualCurrency(defaultCurrencyForAccount(accounts, preferredAccountId));
    }
  }, [accounts, isOpen, preferredAccountId]);

  useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((category) => category.id === manualCategoryId)) {
      setManualCategoryId(categories[0].id);
    }
  }, [categories, manualCategoryId]);

  useEffect(() => {
    if (!accounts.length) return;
    if (!accounts.some((account) => account.id === manualAccountId)) {
      const nextId =
        preferredAccountId && accounts.some((account) => account.id === preferredAccountId)
          ? preferredAccountId
          : accounts[0].id;
      setManualAccountId(nextId);
      setManualCurrency(defaultCurrencyForAccount(accounts, nextId));
    }
  }, [accounts, manualAccountId, preferredAccountId]);

  useEffect(() => {
    if (!isOpen) {
      setStep("choose");
      setDoneMessage(null);
      setPreviews([]);
      setErrors([]);
      setAccountSelections({});
      setImportResult(null);
      setManualDescription("");
      setManualAmount("");
      setManualDate(format(new Date(), "yyyy-MM-dd"));
      setDragging(false);
      setManualType("expense");
      setManualCurrency(
        defaultCurrencyForAccount(
          accounts,
          preferredAccountId && accounts.some((account) => account.id === preferredAccountId)
            ? preferredAccountId
            : (accounts[0]?.id ?? "")
        )
      );
      setCreatedMonth(null);
    }
  }, [accounts, isOpen, preferredAccountId]);

  if (!isOpen) return null;

  function resolvePreferredAccountId(preview: ParsedFilePreview): string {
    const preferred = preferredAccountId
      ? accounts.find((account) => account.id === preferredAccountId)
      : null;

    if (preferred) {
      const compatible = accountsForImportSelection(preview, accounts);
      if (compatible.some((account) => account.id === preferred.id)) {
        return preferred.id;
      }
    }

    return preview.suggestedAccountId ?? "";
  }

  function goToMovements(monthKey: string) {
    const href = buildMovementsHref({ month: monthKey });
    resetAndClose();
    router.replace(href);
    router.refresh();
  }

  function resetAndClose() {
    close();
    setStep("choose");
    setDoneMessage(null);
    setPreviews([]);
    setErrors([]);
    setAccountSelections({});
    setImportResult(null);
    setManualDescription("");
    setManualAmount("");
    setManualDate(format(new Date(), "yyyy-MM-dd"));
    setManualType("expense");
    setCreatedMonth(null);
    setManualCurrency(
      defaultCurrencyForAccount(
        accounts,
        preferredAccountId && accounts.some((account) => account.id === preferredAccountId)
          ? preferredAccountId
          : (accounts[0]?.id ?? "")
      )
    );
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const formData = new FormData();
    formData.append("files", files[0]);

    startTransition(async () => {
      const result = await parseUploadedFiles(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const nextPreviews = (result.previews ?? []).slice(0, 1);
      const selections: Record<string, string> = {};
      for (const preview of nextPreviews) {
        const selected = resolvePreferredAccountId(preview);
        if (selected) {
          selections[preview.filename] = selected;
        }
      }

      setPreviews(nextPreviews);
      setErrors(result.errors ?? []);
      setAccountSelections(selections);
    });
  }

  function clearPreviews() {
    setPreviews([]);
    setAccountSelections({});
    setErrors([]);
  }

  function canImport() {
    return previews.length > 0 && previews.every((p) => Boolean(accountSelections[p.filename]));
  }

  async function handleImport() {
    if (!canImport()) {
      toast.error("Select an account for each file before continuing");
      return;
    }

    startTransition(async () => {
      const mappings: Record<
        string,
        {
          accountId?: string;
          createAccount?: {
            name: string;
            institution: string;
            type: Account["type"];
          };
        }
      > = {};

      for (const preview of previews) {
        const accountId = accountSelections[preview.filename];
        const matched = accounts.find((account) => account.id === accountId);
        mappings[preview.filename] = matched?.id
          ? { accountId: matched.id }
          : {
              createAccount: defaultAccountForPreview({
                accountType: preview.accountType,
                currency: preview.currency,
                institution: preview.institution,
              }),
            };
      }

      const result = await processImport(previews, mappings);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const monthsCovered = result.monthsCovered ?? [];
      const monthsUpdated = result.monthsUpdated ?? [];
      const coverageMonth =
        monthsUpdated[monthsUpdated.length - 1] ??
        monthsCovered[monthsCovered.length - 1] ??
        targetMonth;
      const coverage = await fetchMonthImportCoverage(coverageMonth);
      setImportResult({
        totalImported: result.totalImported ?? 0,
        totalSkipped: result.totalSkipped ?? 0,
        totalReview: result.totalReview ?? 0,
        totalToConfirm: result.totalToConfirm ?? 0,
        totalAuto: result.totalAuto ?? 0,
        totalSuggested: result.totalSuggested ?? 0,
        redirectTo: result.redirectTo,
        monthsCovered,
        monthsUpdated,
        coverage,
      });
      if (coverageMonth !== targetMonth) {
        setTargetMonth(coverageMonth);
      }
      setStep("result");
    });
  }

  async function handleManualSave() {
    const amount = Number(manualAmount.replace(/,/g, ""));
    startTransition(async () => {
      const result = await createManualTransaction({
        month: targetMonth,
        description: manualDescription,
        amount,
        accountId: manualAccountId,
        categoryId: typeNeedsCategory(manualType) ? manualCategoryId : null,
        transactionType: manualType,
        transactionDate: manualDate || format(new Date(), "yyyy-MM-dd"),
        currency: manualCurrency,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      const monthKey = result.month ?? targetMonth;
      goToMovements(monthKey);
      toast.success("Movement added");
    });
  }

  function handleReview() {
    if (importResult?.redirectTo) {
      resetAndClose();
      router.push(importResult.redirectTo);
      return;
    }
    setStep("done");
  }

  function handleDone() {
    goToMovements(createdMonth ?? targetMonth);
  }

  function handleClose() {
    if (createdMonth) {
      goToMovements(createdMonth);
      return;
    }
    resetAndClose();
  }

  const totalFound =
    (importResult?.totalImported ?? 0) + (importResult?.totalSkipped ?? 0);
  const canSaveManual =
    Boolean(manualDescription.trim()) &&
    Boolean(manualAccountId) &&
    (!typeNeedsCategory(manualType) || Boolean(manualCategoryId)) &&
    Number(manualAmount.replace(/,/g, "")) !== 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,27,41,0.35)] p-4">
        <div className="relative max-h-[90vh] w-full max-w-[480px] overflow-auto rounded-[26px] bg-white p-8">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#F3F1F9] hover:text-[#1C1B29]"
          >
            <X className="size-5" />
          </button>
          {step === "choose" && (
            <>
              <h2 className="text-[22px] font-extrabold">Add movements</h2>
              <p className="mt-1.5 text-sm font-semibold text-[#6E6B82]">
                Upload your bank or card file and we&apos;ll organize it. Existing movements
                stay — duplicates are skipped.
              </p>
              <p className="mt-5 text-xs font-semibold text-[#6E6B82]">After import, open:</p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-2 w-full rounded-[13px] bg-[#F3F1F9] px-4 py-3 text-left text-sm font-bold"
              >
                {monthLabel} ▾
              </button>
              <p className="mt-2 text-[12px] font-semibold text-[#9E9AB0]">
                File dates decide which months get movements. You can upload a statement that
                spans two months without replacing what&apos;s already there.
              </p>
              {preferredAccountId &&
                (() => {
                  const preferred = accounts.find((account) => account.id === preferredAccountId);
                  if (!preferred) return null;
                  return (
                    <p className="mt-2 text-[13px] font-bold text-[#6C3FD1]">
                      Account: {getAccountDisplayName(preferred)}
                    </p>
                  );
                })()}

              {previews.length === 0 ? (
                <label
                  className={cn(
                    "mt-5 block cursor-pointer rounded-[20px] border-2 border-dashed p-9 text-center transition-colors",
                    dragging
                      ? "border-[#6C3FD1] bg-[#F3F1F9]"
                      : "border-[#D8D4E8] hover:border-[#C4BDE0]"
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragging(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                >
                  <p className="text-[15px] font-bold">Drop your bank or card file here</p>
                  <p className="mt-2 text-sm font-semibold text-[#6E6B82]">or</p>
                  <span className="mt-4 inline-block rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-2.5 text-sm font-bold text-white">
                    Choose file
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <div className="mt-5 rounded-[20px] border-2 border-[#C9B8F0] bg-[#F3F1F9] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-extrabold text-[#3D2A7A]">File loaded</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#6E6B82]">
                        {previews[0].transactionCount} movements ready · choose account below
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearPreviews}
                      className="shrink-0 text-[12px] font-bold text-[#6E6B82] hover:text-[#3D2A7A]"
                    >
                      Clear
                    </button>
                  </div>

                  {previews.map((preview) => {
                    const selectedId = accountSelections[preview.filename] ?? "";
                    const suggestedAccount = preview.suggestedAccountId
                      ? accounts.find((a) => a.id === preview.suggestedAccountId)
                      : null;
                    const dateRange =
                      preview.statementStart && preview.statementEnd
                        ? formatStatementDateRange(
                            preview.statementStart,
                            preview.statementEnd
                          )
                        : null;
                    const monthsLabel = formatMonthsCoveredLabel(preview.monthsCovered);
                    const spansMonths = preview.monthsCovered.length > 1;

                    return (
                      <div
                        key={preview.filename}
                        className="mt-4 rounded-[14px] border border-[#E2DEF0] bg-white px-4 py-3 text-sm font-semibold"
                      >
                        <p>
                          {preview.filename} · {preview.transactionCount} movements ·{" "}
                          {preview.currency}
                        </p>
                        {(dateRange || monthsLabel) && (
                          <p className="mt-1 text-[12px] font-semibold text-[#6E6B82]">
                            {dateRange ? `Dates: ${dateRange}` : null}
                            {dateRange && monthsLabel ? " · " : null}
                            {monthsLabel ? `Covers ${monthsLabel}` : null}
                          </p>
                        )}
                        {spansMonths && (
                          <p className="mt-1 text-[12px] font-bold text-[#6C3FD1]">
                            Spans more than one month — existing movements will be kept.
                          </p>
                        )}
                        <div className="mt-2">
                          <label className="mb-1 block text-xs font-bold text-[#6E6B82]">
                            Which account is this file for?
                          </label>
                          <select
                            value={selectedId}
                            onChange={(e) =>
                              setAccountSelections((c) => ({
                                ...c,
                                [preview.filename]: e.target.value,
                              }))
                            }
                            className="w-full rounded-[12px] border border-[#E2DEF0] bg-white px-3 py-2 text-sm font-semibold"
                          >
                            <option value="">Select account</option>
                            {canonicalAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {getAccountDisplayName(account)}
                              </option>
                            ))}
                          </select>
                          {suggestedAccount && (
                            <p className="mt-1 text-xs font-semibold text-[#6E6B82]">
                              Suggested: {getAccountDisplayName(suggestedAccount)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <PrimaryButton
                    className="mt-4 w-full"
                    disabled={isPending || !canImport()}
                    onClick={handleImport}
                  >
                    {isPending ? "Processing..." : "Continue"}
                  </PrimaryButton>
                </div>
              )}

              {errors.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm text-red-600">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => {
                  setManualDate(format(new Date(), "yyyy-MM-dd"));
                  setStep("manual");
                }}
                className="mt-4 block w-full text-center text-[13px] font-bold text-[#6C3FD1]"
              >
                Or add one movement manually
              </button>

              <button
                type="button"
                onClick={resetAndClose}
                className="mt-4 w-full text-center text-sm font-semibold text-[#6E6B82]"
              >
                Cancel
              </button>
            </>
          )}

          {step === "manual" && (
            <>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mb-3 text-[13px] font-semibold text-[#6E6B82]"
              >
                ← Back
              </button>
              <h2 className="text-xl font-extrabold">Add a movement</h2>
              <p className="mt-1 text-[13px] font-semibold text-[#6E6B82]">
                Adding to {monthLabel}
              </p>

              <div className="mt-5 space-y-3.5">
                <input
                  type="text"
                  placeholder="Description"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
                />

                <div className="grid grid-cols-[1fr_auto] gap-2.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
                  />
                  <div className="flex rounded-[13px] bg-[#F3F1F9] p-1">
                    {CURRENCY_OPTIONS.map((currency) => {
                      const active = manualCurrency === currency;
                      return (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => setManualCurrency(currency)}
                          className={cn(
                            "rounded-[10px] px-3 py-2 text-[13px] font-bold transition-colors",
                            active
                              ? "bg-white text-[#6C3FD1] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
                              : "text-[#6E6B82]"
                          )}
                        >
                          {currency}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#6E6B82]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full rounded-[13px] border border-[#E2DEF0] px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#6C3FD1]"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[#6E6B82]">Type</p>
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_TYPE_OPTIONS.map((option) => {
                      const active = manualType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setManualType(option.value);
                            const nextCategories = categoriesForTransactionType(
                              categories,
                              option.value
                            );
                            if (
                              nextCategories.length > 0 &&
                              !nextCategories.some((category) => category.id === manualCategoryId)
                            ) {
                              setManualCategoryId(nextCategories[0].id);
                            }
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                            active
                              ? "bg-[#6C3FD1] text-white"
                              : "bg-[#F3F1F9] text-[#1C1B29]"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {typeNeedsCategory(manualType) && (
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-[#6E6B82]">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {categoriesForTransactionType(categories, manualType).map((category) => {
                        const visual = getCategoryVisual(category.slug);
                        const active = manualCategoryId === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setManualCategoryId(category.id)}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                              active ? "text-white" : "bg-[#F3F1F9] text-[#1C1B29]"
                            )}
                            style={active ? { backgroundColor: visual.chipColor } : undefined}
                          >
                            {category.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[13px] font-semibold text-[#6E6B82]">
                    Which account is this from?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canonicalAccounts.map((account) => {
                      const active = manualAccountId === account.id;
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setManualAccountId(account.id);
                            setManualCurrency(account.currency);
                          }}
                          className={cn(
                            "rounded-[12px] px-3.5 py-2 text-[13px] font-bold transition-colors",
                            active
                              ? "bg-[#6C3FD1] text-white"
                              : "bg-[#F3F1F9] text-[#1C1B29]"
                          )}
                        >
                          {getAccountDisplayName(account)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <PrimaryButton
                className="mt-6 w-full"
                disabled={isPending || !canSaveManual}
                onClick={handleManualSave}
              >
                {isPending ? "Saving..." : "Save movement"}
              </PrimaryButton>
            </>
          )}

          {step === "result" && importResult && (
            <>
              <h2 className="text-xl font-extrabold">
                {importResult.monthsCovered.length > 1
                  ? formatMonthsCoveredLabel(importResult.monthsCovered)
                  : monthLabel}
              </h2>
              {importResult.monthsCovered.length > 1 && (
                <p className="mt-2 text-[13px] font-semibold text-[#6E6B82]">
                  Statement covered more than one month. Existing movements were kept.
                </p>
              )}
              {importResult.coverage && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {importResult.coverage.accounts.map((account) => (
                    <span
                      key={account.id}
                      className={`rounded-full px-3.5 py-2 text-[13px] font-bold ${
                        account.imported
                          ? "bg-[#E7F8F0] text-[#0F9D58]"
                          : "bg-[#F3F1F9] text-[#9E9AB0]"
                      }`}
                    >
                      {account.name} {account.imported ? "✓" : "—"}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 rounded-[18px] bg-[#F3F1F9] p-5">
                <p className="text-xl font-extrabold">{totalFound} movements found</p>
                <div className="mt-3 space-y-2 text-sm font-semibold text-[#4B4860]">
                  <p>{importResult.totalImported} new movements added</p>
                  <p>{importResult.totalAuto} organized automatically</p>
                  {(importResult.totalSuggested ?? 0) > 0 && (
                    <p>{importResult.totalSuggested} suggested by AI</p>
                  )}
                  {importResult.totalReview > 0 && (
                    <p>{importResult.totalReview} need your help</p>
                  )}
                  {importResult.totalSkipped > 0 && (
                    <p>
                      {importResult.totalSkipped} already existed — left untouched
                    </p>
                  )}
                </div>
              </div>
              {(importResult.totalToConfirm ?? 0) > 0 && importResult.redirectTo ? (
                <PrimaryButton className="mt-5 w-full" onClick={handleReview}>
                  Review {importResult.totalToConfirm}
                </PrimaryButton>
              ) : (
                <PrimaryButton className="mt-5 w-full" onClick={() => setStep("done")}>
                  Continue
                </PrimaryButton>
              )}
            </>
          )}

          {step === "done" && (
            <div className="py-5 text-center">
              <p className="text-xl font-extrabold">
                {doneMessage ?? `${monthNameOnly} is up to date ✓`}
              </p>
              <PrimaryButton className="mt-6" onClick={handleDone}>
                Done
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>

      <MonthPickerModal
        open={pickerOpen}
        year={year}
        selectedMonth={targetMonth}
        onSelect={(m) => setTargetMonth(m)}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
