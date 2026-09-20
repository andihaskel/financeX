import { createHash } from "crypto";

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
