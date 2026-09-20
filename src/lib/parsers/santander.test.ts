import { describe, expect, it } from "vitest";

import {
  allParsers,
  isSantanderBankAccountExport,
  isSantanderCreditCardMovementsDetail,
  santanderBankAccountParser,
  santanderCreditCardParser,
} from "@/lib/parsers/santander";
import { detectParser } from "@/lib/parsers/types";

const SAMPLE_CREDIT_CARD_DETAIL = `Cliente,Número de tarjeta de crédito,Alias,Tipo de producto,Fecha de corte,Fecha de vencimiento,Límite de crédito (US$),Límite de crédito ($),
"Andres, Haskel Socolovsky",XXXXX-5870,Mastercard Platinum AA,Tarjeta de crédito,28/08/2026,14/09/2026,"0,00","50.000,00",

Movimientos,
Fecha,Número de tarjeta,Número de autorización,Descripción,Importe original,Pesos,Dólares,
28/07/2026,XXXXX-5870,800918651980,Dlo Pedidosya Wantan,"0,00","477,93","0,00",
29/07/2026,XXXXX-5870,800918651980,Airbnb   Hmdcc4f2s8,"0,00","0,00","399,83",
05/08/2026,XXXXX-5870,800918651980,Pago Supernet,"-711,29","-28.618,60","0,00",
12/08/2026,XXXXX-5870,800918651980,Spotify P4593cb6c0,"0,00","0,00","15,44",
`;

const SAMPLE_UYU_BANK = `Cliente,HaskelS Andres,
Cuenta,Cta.Total Univ Básica,
Número,000000500895,
Moneda,UYU,
Sucursal,02 - 18 De Julio,

Movimientos,
Desde:,01/08/2026,Hasta:,31/08/2026

Fecha,Referencia,Concepto,Descripción,Débito,Crédito,Saldos,
10/08/2026,622110266576,"COMPRA CON TARJETA DEBITO DLO.PEDIDOSYA PLUS, MONTEVIDEO TARJ: ############1789",,-343.28,,24.61,
18/08/2026,351500,CREDITO OPERACION EN BANCA DIGITAL P--/HASKEL SOCOLOVSKY ANDRES,,,4000.00,4909.61,
21/08/2026,01370001800918651980,PAGO ELECTRONICO TARJETA CREDITO ,,-28618.60,,11139.35,
`;

describe("Santander UYU bank export detection", () => {
  it("recognizes bank account metadata format", () => {
    expect(isSantanderBankAccountExport(SAMPLE_UYU_BANK)).toBe(true);
  });

  it("uses bank parser, not credit card parser", () => {
    const detection = detectParser(SAMPLE_UYU_BANK, "umsatz.csv", allParsers);
    expect(detection.parser?.name).toBe("Santander Bank Account");
  });

  it("parses transactions with correct currency and count", () => {
    const result = santanderBankAccountParser.parse(SAMPLE_UYU_BANK, "export.csv");
    expect(result.detectedCurrency).toBe("UYU");
    expect(result.detectedAccountType).toBe("bank_account");
    expect(result.transactions).toHaveLength(3);
    expect(result.transactions[0].description).toContain("PEDIDOSYA");
    expect(result.transactions[1].amount).toBe(4000);
  });

  it("parses USD bank exports and skips saldo inicial rows", () => {
    const sample = `Cliente,Haskel S Andres,
Cuenta,Cta.Total Univ Básica,
Número,005100467528,
Moneda,USD,
Sucursal,02 - 18 De Julio,

Movimientos,
Desde:,01/08/2026,Hasta:,31/08/2026

Fecha,Referencia,Concepto,Descripción,Débito,Crédito,Saldos,
,,Saldo inicial,,,,24471.76
03/08/2026,723343,DEBITO OPERACION EN BANCA DIGITAL T--,-44.00,,24427.76,
04/08/2026,LR58556952,TRANSF INSTANTANEA RECIBIDA ALMEIDA,,195.00,24480.84,
`;

    expect(isSantanderBankAccountExport(sample)).toBe(true);
    const detection = detectParser(sample, "auszug.csv", allParsers);
    expect(detection.parser?.name).toBe("Santander Bank Account");

    const result = santanderBankAccountParser.parse(sample, "auszug.csv");
    expect(result.detectedCurrency).toBe("USD");
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].description).toContain("DEBITO OPERACION");
    expect(result.transactions[0].amount).toBe(-44);
    expect(result.transactions[1].amount).toBe(195);
  });
});

describe("Santander credit card movements detail export", () => {
  it("recognizes CreditCardsMovementsDetail format", () => {
    expect(isSantanderCreditCardMovementsDetail(SAMPLE_CREDIT_CARD_DETAIL)).toBe(true);
    expect(isSantanderBankAccountExport(SAMPLE_CREDIT_CARD_DETAIL)).toBe(false);
  });

  it("uses credit card parser", () => {
    const detection = detectParser(
      SAMPLE_CREDIT_CARD_DETAIL,
      "CreditCardsMovementsDetail (8).csv",
      allParsers
    );
    expect(detection.parser?.name).toBe("Santander Credit Card");
  });

  it("parses pesos and dolares columns with correct signs", () => {
    const result = santanderCreditCardParser.parse(
      SAMPLE_CREDIT_CARD_DETAIL,
      "CreditCardsMovementsDetail (8).csv"
    );

    expect(result.detectedAccountType).toBe("credit_card");
    expect(result.transactions).toHaveLength(4);

    const pedidosya = result.transactions.find((tx) => tx.description.includes("Pedidosya"));
    expect(pedidosya?.amount).toBe(-477.93);
    expect(pedidosya?.currency).toBe("UYU");

    const airbnb = result.transactions.find((tx) => tx.description.includes("Airbnb"));
    expect(airbnb?.amount).toBe(-399.83);
    expect(airbnb?.currency).toBe("USD");

    const payment = result.transactions.find((tx) => tx.description.includes("Pago Supernet"));
    expect(payment?.amount).toBe(28618.6);
    expect(payment?.currency).toBe("UYU");

    const spotify = result.transactions.find((tx) => tx.description.includes("Spotify"));
    expect(spotify?.amount).toBe(-15.44);
    expect(spotify?.currency).toBe("USD");
  });
});
