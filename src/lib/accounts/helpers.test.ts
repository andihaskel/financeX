import { describe, expect, it } from "vitest";

import {
  dedupeAccounts,
  getAccountDisplayName,
  getAccountShortLabel,
  matchAccountForImport,
  sortAccounts,
} from "@/lib/accounts/helpers";
import type { Account } from "@/types/database";

const accounts: Account[] = [
  {
    id: "1",
    user_id: "u",
    name: "Santander UYU",
    institution: "Santander",
    type: "bank_account",
    currency: "UYU",
    active: true,
    created_at: "",
  },
  {
    id: "2",
    user_id: "u",
    name: "Santander USD",
    institution: "Santander",
    type: "bank_account",
    currency: "USD",
    active: true,
    created_at: "",
  },
  {
    id: "3",
    user_id: "u",
    name: "Credit Card",
    institution: "Santander",
    type: "credit_card",
    currency: "USD",
    active: true,
    created_at: "",
  },
];

describe("account helpers", () => {
  it("matches Santander UYU bank export to UYU account", () => {
    const match = matchAccountForImport(
      { accountType: "bank_account", currency: "UYU", institution: "Santander" },
      accounts
    );
    expect(match.confidence).toBe("high");
    expect(match.account?.id).toBe("1");
  });

  it("matches credit card export to card account", () => {
    const match = matchAccountForImport(
      { accountType: "credit_card", currency: "USD", institution: "Santander" },
      accounts
    );
    expect(match.confidence).toBe("high");
    expect(match.account?.id).toBe("3");
  });

  it("builds compact labels for month tiles", () => {
    expect(getAccountShortLabel(accounts[0])).toBe("UYU");
    expect(getAccountShortLabel(accounts[2])).toBe("Card");
  });

  it("sorts accounts UYU, USD, card", () => {
    const sorted = sortAccounts([accounts[2], accounts[1], accounts[0]]);
    expect(sorted.map((account) => account.id)).toEqual(["1", "2", "3"]);
  });

  it("dedupes duplicate bank accounts to three canonical slots", () => {
    const withDupes: Account[] = [
      ...accounts,
      {
        ...accounts[0],
        id: "1b",
        type: "checking",
      },
      {
        ...accounts[0],
        id: "1c",
        name: "Santander UYU duplicate",
      },
    ];
    const canonical = dedupeAccounts(withDupes);
    expect(canonical).toHaveLength(3);
    expect(canonical.map((account) => account.id)).toEqual(["1", "2", "3"]);
  });

  it("shows credit card in Spanish", () => {
    expect(getAccountDisplayName(accounts[2])).toBe("Tarjeta de crédito");
  });
});
