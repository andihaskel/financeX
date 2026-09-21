import { createHash } from "crypto";
import { differenceInCalendarDays, parseISO } from "date-fns";

/** Max calendar days apart to treat re-import rows as the same movement after a manual date edit. */
export const IMPORT_DATE_SHIFT_DEDUPE_DAYS = 45;

export interface FingerprintInput {
  accountId: string;
  transactionDate: string;
  amount: number;
  normalizedDescription: string;
  referenceNumber?: string | null;
}

export function generateTransactionFingerprint(
  input: FingerprintInput
): string {
  const normalizedAmount = input.amount.toFixed(2);
  const parts = [
    input.accountId,
    input.transactionDate,
    normalizedAmount,
    input.normalizedDescription.trim().toUpperCase(),
    input.referenceNumber?.trim() ?? "",
  ];

  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export type TransactionDedupeFields = {
  accountId: string;
  amount: number;
  normalizedDescription: string;
  transactionDate: string;
};

/** Same account, amount, and description within a date window (e.g. moved Aug ↔ Sep). */
export function isImportDuplicateDespiteDateShift(
  existing: TransactionDedupeFields,
  incoming: TransactionDedupeFields
): boolean {
  if (existing.accountId !== incoming.accountId) return false;
  if (existing.amount.toFixed(2) !== incoming.amount.toFixed(2)) return false;

  const existingDesc = existing.normalizedDescription.trim().toUpperCase();
  const incomingDesc = incoming.normalizedDescription.trim().toUpperCase();
  if (existingDesc !== incomingDesc) return false;

  const days = Math.abs(
    differenceInCalendarDays(
      parseISO(existing.transactionDate),
      parseISO(incoming.transactionDate)
    )
  );
  return days <= IMPORT_DATE_SHIFT_DEDUPE_DAYS;
}

export function normalizeDescription(description: string): string {
  let normalized = description.trim().toUpperCase();

  // Remove masked/full card numbers
  normalized = normalized.replace(/\b#{4,}\d*\b/g, " ");
  normalized = normalized.replace(/\b\d{4,}\b/g, " ");

  // Strip purchase noise, but KEEP transfer/payment keywords used by rules
  // (never strip leading "PAGO " or "TRANSFERENCIA " — rules depend on them)
  const prefixes = [
    /^COMPRA CON TARJETA DEBITO\s+DLO\./,
    /^COMPRA CON TARJETA DEBITO\s+/,
    /^COMPRA EN\s+/,
    /^DEBITO AUTOMATICO\s+/,
  ];

  for (const prefix of prefixes) {
    normalized = normalized.replace(prefix, "");
  }

  // Drop trailing city + card marker: ", MONTEVIDEO TARJ: ..."
  normalized = normalized.replace(
    /,?\s*(MONTEVIDEO|SALTO|PUNTA DEL ESTE|NMBMONTEVIDEO|NMB\w*)(\s+TARJ:.*)?$/i,
    ""
  );
  normalized = normalized.replace(/\s*TARJ:.*$/i, "");

  // Remove generic reference tokens
  normalized = normalized.replace(/\bREF[\s.:]*[\w-]+\b/gi, " ");
  normalized = normalized.replace(/\bID[\s.:]*[\w-]+\b/gi, " ");

  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized || description.trim().toUpperCase();
}
