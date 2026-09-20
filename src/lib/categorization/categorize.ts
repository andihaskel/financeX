import type {
  CategorizationRule,
  CategorizationStatus,
  TransactionType,
} from "@/types/database";

export interface CategorizationResult {
  transaction_type: TransactionType;
  category_id: string | null;
  excluded_from_spending: boolean;
  is_recurring: boolean;
  is_extraordinary: boolean;
  categorization_status: CategorizationStatus;
  categorization_rule_id: string | null;
}

export interface TransactionToCategorize {
  normalized_description: string;
  amount: number;
}

function exclusionResult(
  transactionType: TransactionType
): CategorizationResult {
  return {
    transaction_type: transactionType,
    category_id: null,
    excluded_from_spending: true,
    is_recurring: false,
    is_extraordinary: false,
    categorization_status: "auto",
    categorization_rule_id: null,
  };
}

/** Built-in Santander Uruguay patterns that must work even without DB rules. */
export function detectBuiltInBankPattern(
  description: string
): CategorizationResult | null {
  const text = description.toUpperCase();

  if (text.includes("PAGO ELECTRONICO TARJETA CREDITO")) {
    return exclusionResult("credit_card_payment");
  }

  if (
    text.includes("TRANSFERENCIA ENVIADA") ||
    text.includes("TRANSFERENCIA RECIBIDA") ||
    text.includes("TRF. PLAZA") ||
    text.includes("TRF PLAZA") ||
    /\bP--\//.test(text) ||
    /\bT--\//.test(text) ||
    text.includes("P--/") ||
    text.includes("T--/")
  ) {
    return exclusionResult("transfer");
  }

  // Digital banking debit that is clearly a transfer to a person/company
  if (text.includes("DEBITO OPERACION EN BANCA DIGITAL")) {
    if (
      text.includes("TRF") ||
      text.includes("TRP") ||
      /-\s*TR\b/.test(text) ||
      text.includes("P--") ||
      text.includes("T--")
    ) {
      return exclusionResult("transfer");
    }
  }

  if (text.includes("CREDITO OPERACION EN BANCA DIGITAL") && (text.includes("P--") || text.includes("T--"))) {
    return exclusionResult("transfer");
  }

  return null;
}

function matchesRule(
  description: string,
  rule: CategorizationRule
): boolean {
  const pattern = rule.pattern.toUpperCase();
  const text = description.toUpperCase();

  switch (rule.match_type) {
    case "exact":
      return text === pattern;
    case "starts_with":
      return text.startsWith(pattern);
    case "contains":
    default:
      return text.includes(pattern);
  }
}

export function categorizeTransaction(
  transaction: TransactionToCategorize,
  rules: CategorizationRule[]
): CategorizationResult {
  const builtIn = detectBuiltInBankPattern(transaction.normalized_description);
  if (builtIn) {
    return builtIn;
  }

  const sortedRules = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (!matchesRule(transaction.normalized_description, rule)) continue;

    const isExclusion =
      rule.excluded_from_spending ||
      rule.transaction_type === "transfer" ||
      rule.transaction_type === "credit_card_payment";

    return {
      transaction_type: rule.transaction_type,
      category_id: rule.category_id,
      excluded_from_spending: rule.excluded_from_spending,
      is_recurring: rule.is_recurring,
      is_extraordinary: rule.is_extraordinary,
      categorization_status: isExclusion ? "auto" : "auto",
      categorization_rule_id: rule.id,
    };
  }

  // Infer income from positive amounts on bank accounts when no rule matched
  if (transaction.amount > 0) {
    return {
      transaction_type: "income",
      category_id: null,
      excluded_from_spending: false,
      is_recurring: false,
      is_extraordinary: false,
      categorization_status: "suggested",
      categorization_rule_id: null,
    };
  }

  return {
    transaction_type: "expense",
    category_id: null,
    excluded_from_spending: false,
    is_recurring: false,
    is_extraordinary: false,
    categorization_status: "needs_review",
    categorization_rule_id: null,
  };
}

export function applyManualCategorization(
  result: CategorizationResult
): CategorizationResult {
  return {
    ...result,
    categorization_status: "manual",
  };
}
