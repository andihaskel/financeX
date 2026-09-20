"use server";

import { revalidatePath } from "next/cache";

import {
  defaultAccountForPreview,
  dedupeAccounts,
  matchAccountForImport,
  sortAccounts,
} from "@/lib/accounts/helpers";
import { getAccounts } from "@/lib/queries/finance";
import { categorizeTransaction, type CategorizationResult } from "@/lib/categorization/categorize";
import {
  applyAiClassification,
  classifyTransactionsWithOpenAi,
  deriveCategoryFlags,
  ensureSuggestedExpenseCategory,
  finalizeAutomaticRows,
  guessCategoryFromTexts,
  isNeedsReviewForImport,
  shouldClassifyWithAi,
  transactionNeedsUserHelp,
  upgradeExpenseCategory,
  type AiClassifyInput,
} from "@/lib/categorization/openai-classify";
import { spendingCategories } from "@/lib/categories/helpers";
import {
  generateTransactionFingerprint,
  normalizeDescription,
} from "@/lib/categorization/normalize";
import { readCsvFile } from "@/lib/parsers/encoding";
import { allParsers } from "@/lib/parsers/santander";
import { detectParser } from "@/lib/parsers/types";
import { createClient, getUser } from "@/lib/supabase/server";
import type {
  Account,
  AccountType,
  CategorizationRule,
  Category,
  Currency,
  Transaction,
} from "@/types/database";

type TransactionInsert = Omit<Transaction, "id" | "created_at" | "updated_at">;

function rowToCategorization(row: TransactionInsert): CategorizationResult {
  return {
    transaction_type: row.transaction_type,
    category_id: row.category_id,
    excluded_from_spending: row.excluded_from_spending,
    is_recurring: row.is_recurring,
    is_extraordinary: row.is_extraordinary,
    categorization_status: row.categorization_status,
    categorization_rule_id: row.categorization_rule_id,
  };
}

function applyCategorizationToRow(
  row: TransactionInsert,
  categorization: CategorizationResult
): TransactionInsert {
  return {
    ...row,
    transaction_type: categorization.transaction_type,
    category_id: categorization.category_id,
    is_recurring: categorization.is_recurring,
    is_extraordinary: categorization.is_extraordinary,
    excluded_from_spending: categorization.excluded_from_spending,
    categorization_status: categorization.categorization_status,
    categorization_rule_id: categorization.categorization_rule_id,
  };
}

async function enrichRowsWithAi(
  rows: TransactionInsert[],
  categories: Category[]
): Promise<TransactionInsert[]> {
  if (rows.length === 0 || categories.length === 0) {
    return rows;
  }

  const aiInputs: AiClassifyInput[] = [];
  const preClassified = new Map<number, CategorizationResult>();

  rows.forEach((row, index) => {
    const categorization = rowToCategorization(row);
    if (!shouldClassifyWithAi(categorization, row.amount)) {
      return;
    }

    const guessed = guessCategoryFromTexts(
      [row.normalized_description, row.description],
      categories
    );
    if (guessed) {
      preClassified.set(index, {
        transaction_type: "expense",
        category_id: guessed.id,
        excluded_from_spending: categorization.excluded_from_spending,
        ...deriveCategoryFlags(guessed),
        categorization_status: "suggested",
        categorization_rule_id: null,
      });
      return;
    }

    aiInputs.push({
      id: String(index),
      description: row.description,
      normalized_description: row.normalized_description,
      amount: row.amount,
      currency: row.currency,
    });
  });

  const aiResults =
    aiInputs.length > 0
      ? await classifyTransactionsWithOpenAi(aiInputs, categories)
      : new Map<string, { id: string; category_slug: string | null }>();

  return rows.map((row, index) => {
    let categorization = preClassified.get(index) ?? rowToCategorization(row);

    if (!preClassified.has(index)) {
      const ai = aiResults.get(String(index));
      if (ai) {
        categorization = applyAiClassification(
          categorization,
          ai,
          categories,
          row.normalized_description
        );
      }
    }

    categorization = finalizeAutomaticRows(categorization, row.amount);
    categorization = upgradeExpenseCategory(
      categorization,
      row.normalized_description,
      categories
    );
    // Also try original description if still empty
    if (!categorization.category_id) {
      categorization = upgradeExpenseCategory(categorization, row.description, categories);
    }
    categorization = ensureSuggestedExpenseCategory(
      categorization,
      row.normalized_description,
      categories,
      row.amount
    );
    if (!categorization.category_id) {
      categorization = ensureSuggestedExpenseCategory(
        categorization,
        row.description,
        categories,
        row.amount
      );
    }
    return applyCategorizationToRow(row, categorization);
  });
}

function countImportStats(rows: TransactionInsert[], categories: Category[]) {
  const auto = rows.filter((row) => row.categorization_status === "auto").length;
  const suggested = rows.filter((row) => row.categorization_status === "suggested").length;
  const needsReview = rows.filter((row) =>
    isNeedsReviewForImport(row.categorization_status, row, categories)
  ).length;
  const needsHelp = rows.filter((row) => transactionNeedsUserHelp(row)).length;
  return {
    auto,
    suggested,
    needsReview,
    needsHelp,
  };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ParsedFilePreview {
  filename: string;
  institution: string;
  accountType: "bank_account" | "credit_card";
  currency: Currency;
  transactionCount: number;
  confidence: "high" | "medium" | "low";
  content: string;
  suggestedAccountId: string | null;
  needsAccountSelection: boolean;
}

export async function parseUploadedFiles(formData: FormData) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const files = formData.getAll("files") as File[];
  if (files.length === 0) return { error: "No files selected" };

  const previews: ParsedFilePreview[] = [];
  const errors: string[] = [];
  const accounts = sortAccounts(await getAccounts());

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File exceeds 5MB limit`);
      continue;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      errors.push(`${file.name}: Only CSV files are supported`);
      continue;
    }

    try {
      const content = await readCsvFile(file);
      const detection = detectParser(content, file.name, allParsers);

      if (!detection.parser) {
        errors.push(`${file.name}: Could not detect bank format`);
        continue;
      }

      const result = detection.parser.parse(content, file.name);
      const match = matchAccountForImport(
        {
          accountType: result.detectedAccountType,
          currency: result.detectedCurrency,
          institution: result.detectedInstitution,
        },
        accounts
      );

      previews.push({
        filename: file.name,
        institution: result.detectedInstitution,
        accountType: result.detectedAccountType,
        currency: result.detectedCurrency,
        transactionCount: result.transactions.length,
        confidence: detection.confidence,
        content,
        suggestedAccountId: match.account?.id ?? null,
        needsAccountSelection: true,
      });
    } catch (error) {
      errors.push(
        `${file.name}: ${error instanceof Error ? error.message : "Parse failed"}`
      );
    }
  }

  return { previews, errors };
}

export async function processImport(
  previews: ParsedFilePreview[],
  accountMappings: Record<
    string,
    { accountId?: string; createAccount?: { name: string; institution: string; type: AccountType } }
  >
) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true);

  const categorizationRules = (rules ?? []) as CategorizationRule[];

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true);

  const categories = (categoryRows ?? []) as Category[];
  const expenseCategories = spendingCategories(categories);

  const importIds: string[] = [];
  const importedAccountIds = new Set<string>();
  let totalImported = 0;
  let totalSkipped = 0;
  let totalUncategorized = 0;
  let totalToConfirm = 0;
  let totalAuto = 0;
  let totalSuggested = 0;

  for (const preview of previews) {
    const mapping = accountMappings[preview.filename];
    let accountId = mapping?.accountId;

    if (!accountId && mapping?.createAccount) {
      const existing = matchAccountForImport(
        {
          accountType: preview.accountType,
          currency: preview.currency,
          institution: mapping.createAccount.institution,
        },
        dedupeAccounts(await getAccounts())
      );

      if (existing.account) {
        accountId = existing.account.id;
      } else {
        const { data: newAccount, error: accountError } = await supabase
          .from("accounts")
          .insert({
            user_id: user.id,
            name: mapping.createAccount.name,
            institution: mapping.createAccount.institution,
            type: mapping.createAccount.type,
            currency: preview.currency,
            active: true,
          })
          .select("id")
          .single();

        if (accountError || !newAccount) {
          return { error: `Failed to create account: ${accountError?.message}` };
        }
        accountId = newAccount.id;
      }
    }

    if (!accountId) {
      return { error: `No account selected for ${preview.filename}` };
    }

    importedAccountIds.add(accountId);

    const detection = detectParser(preview.content, preview.filename, allParsers);
    if (!detection.parser) {
      return { error: `Parser not found for ${preview.filename}` };
    }

    const parsed = detection.parser.parse(preview.content, preview.filename);

    const { data: importRecord, error: importError } = await supabase
      .from("imports")
      .insert({
        user_id: user.id,
        filename: preview.filename,
        source_type: detection.parser.name,
        account_id: accountId,
        currency: preview.currency,
        transaction_count: parsed.transactions.length,
        status: "review",
      })
      .select("id")
      .single();

    if (importError || !importRecord) {
      return { error: importError?.message ?? "Failed to create import" };
    }

    importIds.push(importRecord.id);

    const { data: existingFingerprints } = await supabase
      .from("transactions")
      .select("fingerprint")
      .eq("user_id", user.id);

    const existingSet = new Set(
      (existingFingerprints ?? []).map((t: { fingerprint: string }) => t.fingerprint)
    );

    const toInsert: TransactionInsert[] = [];

    for (const tx of parsed.transactions) {
      const normalized = normalizeDescription(tx.description);
      const fingerprint = generateTransactionFingerprint({
        accountId,
        transactionDate: tx.transaction_date,
        amount: tx.amount,
        normalizedDescription: normalized,
        referenceNumber: tx.reference_number,
      });

      if (existingSet.has(fingerprint)) {
        totalSkipped++;
        continue;
      }

      const categorization = categorizeTransaction(
        { normalized_description: normalized, amount: tx.amount },
        categorizationRules
      );

      toInsert.push({
        user_id: user.id,
        account_id: accountId,
        import_id: importRecord.id,
        transaction_date: tx.transaction_date,
        description: tx.description,
        normalized_description: normalized,
        amount: tx.amount,
        currency: tx.currency,
        transaction_type: categorization.transaction_type,
        category_id: categorization.category_id,
        is_recurring: categorization.is_recurring,
        is_extraordinary: categorization.is_extraordinary,
        excluded_from_spending: categorization.excluded_from_spending,
        categorization_status: categorization.categorization_status,
        categorization_rule_id: categorization.categorization_rule_id,
        notes: null,
        fingerprint,
      });

      existingSet.add(fingerprint);
    }

    const enrichedRows = await enrichRowsWithAi(toInsert, expenseCategories);
    const fileStats = countImportStats(enrichedRows, expenseCategories);

    if (enrichedRows.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(enrichedRows);

      if (insertError) {
        await supabase
          .from("imports")
          .update({ status: "failed" })
          .eq("id", importRecord.id);
        return { error: insertError.message };
      }
    }

    totalImported += enrichedRows.length;
    totalAuto += fileStats.auto;
    totalSuggested += fileStats.suggested;
    totalUncategorized += fileStats.needsReview;
    totalToConfirm += fileStats.needsHelp;

    await supabase
      .from("imports")
      .update({
        transaction_count: enrichedRows.length,
        status: fileStats.needsHelp > 0 ? "review" : "completed",
      })
      .eq("id", importRecord.id);
  }

  revalidatePath("/home");
  revalidatePath("/movements");
  revalidatePath("/month");
  revalidatePath("/review");

  return {
    importIds,
    totalImported,
    totalSkipped,
    totalReview: totalUncategorized,
    totalToConfirm,
    totalSuggested,
    totalAuto,
    importedAccountIds: [...importedAccountIds],
    redirectTo:
      importIds.length === 1 && totalToConfirm > 0 ? `/review/${importIds[0]}` : undefined,
  };
}

export async function completeImport(importId: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("imports")
    .update({ status: "completed" })
    .eq("id", importId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/home");
  revalidatePath("/movements");
  return { success: true };
}

export async function fetchMonthImportCoverage(month: string) {
  const { getMonthImportCoverage } = await import("@/lib/queries/import-coverage");
  return getMonthImportCoverage(month);
}
