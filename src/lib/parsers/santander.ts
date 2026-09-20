import type { BankParser, ParsedTransaction, ParseResult } from "./types";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function parseAmount(raw: string): number {
  let cleaned = raw.replace(/"/g, "").replace(/\s/g, "");
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // e.g. 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // e.g. 1,234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(",", ".");
  }

  const value = parseFloat(cleaned.replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function parseDate(raw: string): string {
  const value = raw.replace(/"/g, "").trim();
  const ddmmyyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  const yyyymmdd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) return value;
  throw new Error(`Invalid date format: ${value}`);
}

function detectCurrency(content: string, filename: string): "USD" | "UYU" {
  const monedaMatch = content.match(/Moneda,(UYU|USD)/i);
  if (monedaMatch) return monedaMatch[1].toUpperCase() as "USD" | "UYU";

  const upper = `${content}\n${filename}`.toUpperCase();
  if (upper.includes("USD") || upper.includes("DOLAR")) return "USD";
  return "UYU";
}

/** Santander Uruguay credit card CSV (CreditCardsMovementsDetail export). */
export function isSantanderCreditCardMovementsDetail(content: string): boolean {
  const normalized = content
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (isSantanderBankAccountExport(content)) return false;

  const hasCreditCardMetadata =
    normalized.includes("TARJETA DE CREDITO") ||
    normalized.includes("NUMERO DE TARJETA DE CREDITO");

  const hasMovementsSection = /MOVIMIENTOS,/i.test(content);
  const hasDualCurrencyHeader =
    /FECHA.*DESCRIPCION.*PESOS.*DOLAR/i.test(normalized.replace(/\s/g, "")) ||
    /PESOS,DOLAR/i.test(normalized);

  return hasCreditCardMetadata && hasMovementsSection && hasDualCurrencyHeader;
}

function detectCreditCardPrimaryCurrency(transactions: ParsedTransaction[]): "USD" | "UYU" {
  const counts = transactions.reduce(
    (acc, transaction) => {
      acc[transaction.currency] += 1;
      return acc;
    },
    { USD: 0, UYU: 0 }
  );

  return counts.USD > counts.UYU ? "USD" : "UYU";
}

function parseSantanderCreditCardMovementsDetail(lines: string[]): ParsedTransaction[] {
  const headerIndex = lines.findIndex((line) => {
    const headers = parseCsvLine(line).map(normalizeHeader);
    return (
      headers.some((header) => header.includes("fecha")) &&
      headers.some((header) => header.includes("descripcion")) &&
      headers.some((header) => header.includes("peso")) &&
      headers.some((header) => header.includes("dolar"))
    );
  });

  if (headerIndex === -1) {
    throw new Error("Could not find transaction header row");
  }

  const headers = parseCsvLine(lines[headerIndex]).map(normalizeHeader);
  const dateIdx = headers.findIndex((header) => header.includes("fecha"));
  const descriptionIdx = headers.findIndex((header) => header.includes("descripcion"));
  const authorizationIdx = headers.findIndex((header) => header.includes("autorizacion"));
  const pesosIdx = headers.findIndex((header) => header.includes("peso"));
  const dolaresIdx = headers.findIndex((header) => header.includes("dolar"));

  const transactions: ParsedTransaction[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 4) continue;

    const description = cols[descriptionIdx >= 0 ? descriptionIdx : 3]?.replace(/"/g, "").trim();
    if (!description) continue;

    try {
      const transactionDate = parseDate(cols[dateIdx >= 0 ? dateIdx : 0]);
      const pesos = pesosIdx >= 0 ? parseAmount(cols[pesosIdx] || "0") : 0;
      const dolares = dolaresIdx >= 0 ? parseAmount(cols[dolaresIdx] || "0") : 0;

      let amount = 0;
      let currency: "USD" | "UYU" = "UYU";

      if (pesos !== 0) {
        amount = pesos > 0 ? -Math.abs(pesos) : Math.abs(pesos);
        currency = "UYU";
      } else if (dolares !== 0) {
        amount = dolares > 0 ? -Math.abs(dolares) : Math.abs(dolares);
        currency = "USD";
      } else {
        continue;
      }

      transactions.push({
        transaction_date: transactionDate,
        description,
        amount,
        currency,
        reference_number:
          authorizationIdx >= 0 ? cols[authorizationIdx]?.replace(/"/g, "") ?? null : null,
      });
    } catch (error) {
      throw new Error(
        `Row ${i + 1}: ${error instanceof Error ? error.message : "Parse error"}`
      );
    }
  }

  return transactions;
}

/** Santander Uruguay bank account CSV with metadata header (Cliente, Cuenta, Moneda...). */
export function isSantanderBankAccountExport(content: string): boolean {
  return (
    /Cuenta,/i.test(content) &&
    /Moneda,(UYU|USD)/i.test(content) &&
    (/Movimientos,/i.test(content) ||
      /Fecha.*Referencia.*(Concepto|Descrip)/i.test(content))
  );
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/�/g, "")
    .toLowerCase()
    // Tolerate mojibake from Latin-1 files read as UTF-8 (D�bito, Cr�dito, ...)
    .replace(/d[^a-z]*bito/g, "debito")
    .replace(/cr[^a-z]*dito/g, "credito")
    .replace(/descripci[^a-z]*n/g, "descripcion");
}

function isAmountLike(value: string): boolean {
  const cleaned = value.replace(/"/g, "").replace(/\s/g, "");
  if (!cleaned) return false;
  return /^-?\d{1,3}([.,]\d{3})*([.,]\d+)?$|^-?\d+[.,]\d+$|^-?\d+$/.test(cleaned);
}

function parseSantanderBankRows(
  lines: string[],
  currency: "USD" | "UYU"
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let headerIndex = lines.findIndex((line) =>
    /fecha|date/i.test(line) && /descrip|concepto|detalle|referencia/i.test(line)
  );

  if (headerIndex === -1) {
    headerIndex = lines.findIndex((line) => line.split(/[,;]/).length >= 4);
  }

  if (headerIndex === -1) {
    throw new Error("Could not find transaction header row");
  }

  const headers = parseCsvLine(lines[headerIndex]).map(normalizeHeader);

  const dateIdx = headers.findIndex((h) => h.includes("fecha") || h.includes("date"));
  const descripcionIdx = headers.findIndex((h) => h.includes("descrip"));
  const conceptoIdx = headers.findIndex((h) => h.includes("concepto"));
  const debitIdx = headers.findIndex(
    (h) => h.includes("debito") || h.includes("debe")
  );
  const creditIdx = headers.findIndex(
    (h) => h.includes("credito") || h.includes("haber")
  );
  const amountIdx = headers.findIndex(
    (h) => h.includes("importe") || h.includes("monto") || h.includes("amount")
  );
  const refIdx = headers.findIndex((h) => h.includes("referencia"));

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 3) continue;

    const dateRaw = (cols[dateIdx >= 0 ? dateIdx : 0] ?? "").replace(/"/g, "").trim();
    if (!dateRaw) continue;

    const concepto = conceptoIdx >= 0 ? cols[conceptoIdx]?.replace(/"/g, "").trim() : "";
    const descripcion =
      descripcionIdx >= 0 ? cols[descripcionIdx]?.replace(/"/g, "").trim() : "";

    // Concepto is the real merchant/text in Santander exports; Descripción is often empty.
    // USD files sometimes omit the empty Descripción field, shifting Débito into that column.
    const descriptionShifted =
      Boolean(concepto) && Boolean(descripcion) && isAmountLike(descripcion) && !isAmountLike(concepto);

    const description = descriptionShifted
      ? concepto
      : concepto || descripcion;
    if (!description || isAmountLike(description)) continue;
    if (/saldo inicial|saldo final|saldo anterior/i.test(description)) continue;

    try {
      const transactionDate = parseDate(dateRaw);

      let debitRaw = debitIdx >= 0 ? parseAmount(cols[debitIdx] || "0") : 0;
      let creditRaw = creditIdx >= 0 ? parseAmount(cols[creditIdx] || "0") : 0;

      if (descriptionShifted && descripcionIdx >= 0) {
        debitRaw = parseAmount(descripcion);
        // After the shift: original Débito column holds Crédito, Crédito holds Saldo
        creditRaw = debitIdx >= 0 ? parseAmount(cols[debitIdx] || "0") : 0;
      }

      let amount = 0;
      if (debitIdx >= 0 || creditIdx >= 0 || descriptionShifted) {
        if (debitRaw !== 0 && creditRaw !== 0) {
          // When both are filled, the larger value is usually the running balance
          const movement = Math.abs(debitRaw) <= Math.abs(creditRaw) ? debitRaw : creditRaw;
          amount = movement;
        } else if (creditRaw !== 0) {
          amount = creditRaw;
        } else if (debitRaw !== 0) {
          amount = debitRaw < 0 ? debitRaw : -Math.abs(debitRaw);
        } else {
          continue;
        }
      } else if (amountIdx >= 0) {
        amount = parseAmount(cols[amountIdx]);
      } else {
        amount = parseAmount(cols[cols.length - 1]);
      }

      if (amount === 0) continue;

      transactions.push({
        transaction_date: transactionDate,
        description,
        amount,
        currency,
        reference_number: refIdx >= 0 ? cols[refIdx]?.replace(/"/g, "") : null,
      });
    } catch (error) {
      console.warn(
        `Skipping bank row ${i + 1}: ${error instanceof Error ? error.message : "Parse error"}`
      );
    }
  }

  return transactions;
}

export const santanderBankAccountParser: BankParser = {
  name: "Santander Bank Account",
  canParse(content) {
    if (isSantanderBankAccountExport(content)) return true;

    const upper = content.toUpperCase();
    return (
      upper.includes("SANTANDER") &&
      !isSantanderBankAccountExport(content) &&
      (upper.includes("DEBITO") || upper.includes("DÉBITO")) &&
      (upper.includes("FECHA") || upper.includes("MOVIMIENTOS"))
    );
  },
  parse(content, filename): ParseResult {
    const lines = content.split(/\r?\n/).filter(Boolean);
    const currency = detectCurrency(content, filename);
    const transactions = parseSantanderBankRows(lines, currency);

    const dates = transactions.map((t) => t.transaction_date).sort();
    return {
      transactions,
      detectedInstitution: "Santander",
      detectedAccountType: "bank_account",
      detectedCurrency: currency,
      statementPeriod:
        dates.length > 0
          ? { start: dates[0], end: dates[dates.length - 1] }
          : undefined,
    };
  },
};

export const santanderCreditCardParser: BankParser = {
  name: "Santander Credit Card",
  canParse(content) {
    // Bank exports mention "TARJETA" in purchase lines — exclude them.
    if (isSantanderBankAccountExport(content)) return false;
    if (isSantanderCreditCardMovementsDetail(content)) return true;

    const upper = content.toUpperCase();
    return (
      (upper.includes("EXTRACTO") && upper.includes("TARJETA")) ||
      (upper.includes("MASTERCARD") && upper.includes("COMERCIO")) ||
      (upper.includes("TARJETA") &&
        upper.includes("COMERCIO") &&
        upper.includes("FECHA") &&
        !upper.includes("CUENTA,"))
    );
  },
  parse(content, filename): ParseResult {
    const lines = content.split(/\r?\n/).filter(Boolean);

    if (isSantanderCreditCardMovementsDetail(content)) {
      const transactions = parseSantanderCreditCardMovementsDetail(lines);
      const currency = detectCreditCardPrimaryCurrency(transactions);
      const dates = transactions.map((transaction) => transaction.transaction_date).sort();

      return {
        transactions,
        detectedInstitution: "Santander",
        detectedAccountType: "credit_card",
        detectedCurrency: currency,
        statementPeriod:
          dates.length > 0
            ? { start: dates[0], end: dates[dates.length - 1] }
            : undefined,
      };
    }

    const currency = detectCurrency(content, filename);
    const transactions = parseSantanderBankRows(lines, currency).map((t) => ({
      ...t,
      amount: t.amount > 0 ? -t.amount : t.amount,
    }));

    const dates = transactions.map((t) => t.transaction_date).sort();
    return {
      transactions,
      detectedInstitution: "Santander",
      detectedAccountType: "credit_card",
      detectedCurrency: currency,
      statementPeriod:
        dates.length > 0
          ? { start: dates[0], end: dates[dates.length - 1] }
          : undefined,
    };
  },
};

/** Bank account parser first — avoids false credit-card matches on UYU/USD exports. */
export const allParsers: BankParser[] = [
  santanderBankAccountParser,
  santanderCreditCardParser,
];
