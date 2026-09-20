import { describe, expect, it } from "vitest";

import { categorizeTransaction, detectBuiltInBankPattern } from "@/lib/categorization/categorize";
import { normalizeDescription } from "@/lib/categorization/normalize";

describe("normalizeDescription", () => {
  it("keeps PAGO ELECTRONICO so credit-card payment rules still match", () => {
    expect(normalizeDescription("PAGO ELECTRONICO TARJETA CREDITO")).toContain(
      "PAGO ELECTRONICO TARJETA CREDITO"
    );
  });

  it("keeps TRANSFERENCIA ENVIADA", () => {
    expect(
      normalizeDescription(
        "TRANSFERENCIA ENVIADA 546584TT55893327 TRF. PLAZA- LORENA BALDENEGRO GUERRERO"
      )
    ).toContain("TRANSFERENCIA ENVIADA");
  });

  it("strips debit purchase prefix and city/card noise", () => {
    expect(
      normalizeDescription(
        "COMPRA CON TARJETA DEBITO CONFITERIA MAJARK, MONTEVIDEO TARJ: ############1789"
      )
    ).toBe("CONFITERIA MAJARK");
  });
});

describe("built-in bank patterns", () => {
  it("marks credit card payments as auto exclusions", () => {
    const result = detectBuiltInBankPattern("PAGO ELECTRONICO TARJETA CREDITO");
    expect(result?.transaction_type).toBe("credit_card_payment");
    expect(result?.excluded_from_spending).toBe(true);
    expect(result?.categorization_status).toBe("auto");
  });

  it("marks plaza transfers as auto exclusions", () => {
    const sent = detectBuiltInBankPattern(
      "TRANSFERENCIA ENVIADA 546584TT55893327 TRF. PLAZA- LORENA BALDENEGRO GUERRERO"
    );
    expect(sent?.transaction_type).toBe("transfer");

    const debit = detectBuiltInBankPattern(
      "DEBITO OPERACION EN BANCA DIGITAL 546580TT55893327 TRF. PLAZA- LORENA BALDENEGRO GUERRERO"
    );
    expect(debit?.transaction_type).toBe("transfer");

    const named = detectBuiltInBankPattern(
      "DEBITO OPERACION EN BANCA DIGITAL NUNEZ TRPANUÑEZ - TR"
    );
    expect(named?.transaction_type).toBe("transfer");
  });

  it("uses built-in patterns before falling through to needs_review", () => {
    const result = categorizeTransaction(
      {
        normalized_description: normalizeDescription("PAGO ELECTRONICO TARJETA CREDITO"),
        amount: -28618.6,
      },
      []
    );
    expect(result.categorization_status).toBe("auto");
    expect(result.transaction_type).toBe("credit_card_payment");
  });
});
