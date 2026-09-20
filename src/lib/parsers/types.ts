export interface ParsedTransaction {
  transaction_date: string;
  description: string;
  amount: number;
  currency: "USD" | "UYU";
  reference_number?: string | null;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  detectedInstitution: string;
  detectedAccountType: "bank_account" | "credit_card";
  detectedCurrency: "USD" | "UYU";
  statementPeriod?: { start: string; end: string };
}

export interface BankParser {
  name: string;
  canParse(content: string, filename: string): boolean;
  parse(content: string, filename: string): ParseResult;
}

export interface DetectionResult {
  parser: BankParser | null;
  confidence: "high" | "medium" | "low";
  institution?: string;
  accountType?: "bank_account" | "credit_card";
  currency?: "USD" | "UYU";
  transactionCount?: number;
}

export function detectParser(
  content: string,
  filename: string,
  parsers: BankParser[]
): DetectionResult {
  const matches = parsers
    .map((parser) => {
      if (!parser.canParse(content, filename)) return null;
      try {
        const result = parser.parse(content, filename);
        return {
          parser,
          confidence: "high" as const,
          institution: result.detectedInstitution,
          accountType: result.detectedAccountType,
          currency: result.detectedCurrency,
          transactionCount: result.transactions.length,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as DetectionResult[];

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    return { ...matches[0], confidence: "medium" };
  }
  return { parser: null, confidence: "low" };
}
