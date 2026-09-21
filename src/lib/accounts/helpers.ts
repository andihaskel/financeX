import type { Account, AccountType, Currency } from "@/types/database";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank_account: "Bank account",
  credit_card: "Credit card",
  savings: "Savings",
  cash: "Cash",
  investment: "Investment",
  checking: "Checking",
};

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = (
  [
    "bank_account",
    "credit_card",
    "savings",
    "cash",
    "investment",
    "checking",
  ] as const
).map((value) => ({ value, label: ACCOUNT_TYPE_LABELS[value] }));

export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

export type ParsedAccountKind = "bank_account" | "credit_card" | "checking";

export function isBankAccountType(type: AccountType): boolean {
  return type === "bank_account" || type === "checking" || type === "savings";
}

export function isCreditCardType(type: AccountType): boolean {
  return type === "credit_card";
}

export function previewIsCreditCard(accountType: ParsedAccountKind): boolean {
  return accountType === "credit_card";
}

export function sortAccounts(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const rank = (account: Account) => {
      if (isCreditCardType(account.type)) return 3;
      if (account.currency === "USD") return 2;
      if (account.currency === "UYU") return 1;
      return 4;
    };
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

export function getAccountShortLabel(
  account: Pick<Account, "name" | "type" | "currency">
): string {
  if (isCreditCardType(account.type)) return "Card";
  if (account.currency === "UYU") return "UYU";
  if (account.currency === "USD") return "USD";
  return account.name.split(" ")[0] ?? account.name;
}

export function getAccountDisplayName(
  account: Pick<Account, "name" | "type" | "currency">
): string {
  if (isCreditCardType(account.type)) {
    if (account.name === "Credit Card") return "Tarjeta de crédito";
    if (account.name.trim()) return account.name;
    return "Tarjeta de crédito";
  }
  if (account.name.trim()) return account.name;
  if (account.currency === "UYU") return "Santander UYU";
  if (account.currency === "USD") return "Santander USD";
  return "Account";
}

export type AccountBucket = "uyu" | "usd" | "card";

export function getAccountBucket(
  account: Pick<Account, "type" | "currency">
): AccountBucket {
  if (isCreditCardType(account.type)) return "card";
  if (account.currency === "UYU") return "uyu";
  return "usd";
}

function accountCanonicalScore(account: Account): number {
  let score = 0;
  const name = account.name.trim().toLowerCase();
  if (name === "santander uyu" || name === "santander usd") score += 100;
  if (name === "credit card" || name === "tarjeta de crédito" || name === "tarjeta de credito") {
    score += 100;
  }
  if (account.type === "bank_account") score += 10;
  if (account.type === "checking") score += 5;
  if (account.type === "savings") score += 4;
  return score;
}

/** One account per UYU bank, USD bank, and credit card slot. */
export function dedupeAccounts(accounts: Account[]): Account[] {
  const active = accounts.filter((account) => account.active !== false);
  const byBucket = new Map<AccountBucket, Account>();

  for (const account of active) {
    if (!isBankAccountType(account.type) && !isCreditCardType(account.type)) {
      continue;
    }

    const bucket = getAccountBucket(account);
    const existing = byBucket.get(bucket);
    if (!existing || accountCanonicalScore(account) > accountCanonicalScore(existing)) {
      byBucket.set(bucket, account);
    }
  }

  return sortAccounts([...byBucket.values()]);
}

export function accountsForImportSelection(
  preview: ImportPreviewShape,
  accounts: Account[]
): Account[] {
  const canonical = dedupeAccounts(accounts);
  const wantsCard = previewIsCreditCard(preview.accountType);

  return canonical.filter((account) => {
    if (wantsCard) return isCreditCardType(account.type);
    return isBankAccountType(account.type) && account.currency === preview.currency;
  });
}

export interface ImportPreviewShape {
  accountType: ParsedAccountKind;
  currency: Currency;
  institution: string;
}

export function matchAccountForImport(
  preview: ImportPreviewShape,
  accounts: Account[]
): {
  account: Account | null;
  confidence: "high" | "low";
  candidates: Account[];
} {
  const activeAccounts = accounts.filter((account) => account.active !== false);
  const wantsCard = previewIsCreditCard(preview.accountType);

  let candidates = activeAccounts.filter((account) => {
    if (wantsCard) return isCreditCardType(account.type);
    return isBankAccountType(account.type) && account.currency === preview.currency;
  });

  const institution = preview.institution.toLowerCase();
  if (institution) {
    const institutionMatches = candidates.filter((account) => {
      const name = account.name.toLowerCase();
      const inst = account.institution?.toLowerCase() ?? "";
      return name.includes(institution) || inst.includes(institution);
    });
    if (institutionMatches.length > 0) candidates = institutionMatches;
  }

  if (candidates.length === 1) {
    return { account: candidates[0], confidence: "high", candidates: dedupeAccounts(candidates) };
  }

  return {
    account: candidates[0] ?? null,
    confidence: "low",
    candidates: dedupeAccounts(candidates),
  };
}

export function defaultAccountForPreview(preview: ImportPreviewShape): {
  name: string;
  institution: string;
  type: AccountType;
} {
  if (previewIsCreditCard(preview.accountType)) {
    return {
      name: "Tarjeta de crédito",
      institution: preview.institution,
      type: "credit_card",
    };
  }

  if (preview.currency === "UYU") {
    return {
      name: "Santander UYU",
      institution: preview.institution,
      type: "bank_account",
    };
  }

  return {
    name: "Santander USD",
    institution: preview.institution,
    type: "bank_account",
  };
}
