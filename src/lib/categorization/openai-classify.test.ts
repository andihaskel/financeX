import { describe, expect, it } from "vitest";

import type { CategorizationResult } from "@/lib/categorization/categorize";
import {
  applyAiClassification,
  deriveCategoryFlags,
  ensureSuggestedExpenseCategory,
  guessCategoryFromDescription,
  hasConfidentCategory,
  isNeedsReviewForImport,
  isSuggestedByAiForImport,
  resolveCategory,
  shouldClassifyWithAi,
  transactionNeedsUserHelp,
  upgradeExpenseCategory,
} from "@/lib/categorization/openai-classify";
import type { Category } from "@/types/database";

const categories: Category[] = [
  {
    id: "cat-food",
    user_id: "u",
    name: "Comida",
    slug: "comida",
    group: "essential",
    icon: "utensils",
    active: true,
    created_at: "",
  },
  {
    id: "cat-shopping",
    user_id: "u",
    name: "Ocio & compras",
    slug: "ocio-compras",
    group: "discretionary",
    icon: "shopping-bag",
    active: true,
    created_at: "",
  },
  {
    id: "cat-services",
    user_id: "u",
    name: "Servicios",
    slug: "servicios",
    group: "essential",
    icon: "zap",
    active: true,
    created_at: "",
  },
  {
    id: "cat-travel",
    user_id: "u",
    name: "Viajes",
    slug: "viajes",
    group: "extraordinary",
    icon: "plane",
    active: true,
    created_at: "",
  },
  {
    id: "cat-transport",
    user_id: "u",
    name: "Transporte",
    slug: "transporte",
    group: "essential",
    icon: "car",
    active: true,
    created_at: "",
  },
  {
    id: "cat-subs",
    user_id: "u",
    name: "Suscripciones",
    slug: "suscripciones",
    group: "essential",
    icon: "repeat",
    active: true,
    created_at: "",
  },
  {
    id: "cat-health",
    user_id: "u",
    name: "Salud & deporte",
    slug: "salud-deporte",
    group: "essential",
    icon: "heart-pulse",
    active: true,
    created_at: "",
  },
  {
    id: "cat-other",
    user_id: "u",
    name: "Otros",
    slug: "otros",
    group: "discretionary",
    icon: "circle-help",
    active: true,
    created_at: "",
  },
];

const needsReview: CategorizationResult = {
  transaction_type: "expense",
  category_id: null,
  excluded_from_spending: false,
  is_recurring: false,
  is_extraordinary: false,
  categorization_status: "needs_review",
  categorization_rule_id: null,
};

describe("openai classify helpers", () => {
  it("flags uncategorized expenses for AI", () => {
    expect(shouldClassifyWithAi(needsReview, -100)).toBe(true);
    expect(shouldClassifyWithAi(needsReview, 100)).toBe(false);
    expect(
      shouldClassifyWithAi(
        {
          ...needsReview,
          categorization_status: "auto",
        },
        -100
      )
    ).toBe(false);
  });

  it("resolves category slug by name", () => {
    expect(resolveCategory("Comida", categories)?.id).toBe("cat-food");
  });

  it("guesses categories from merchant descriptions", () => {
    expect(
      guessCategoryFromDescription("COMPRA DECATHLON MONTEVIDEO", categories)?.slug
    ).toBe("ocio-compras");
    expect(guessCategoryFromDescription("COMPRA BABILONIA PUNTA CARRETAS", categories)?.slug).toBe(
      "comida"
    );
    expect(
      guessCategoryFromDescription("COMISION TRANSF INSTANTANEA", categories)?.slug
    ).toBe("servicios");
  });

  it("derives extraordinary flag from category group", () => {
    expect(deriveCategoryFlags(categories[3]!)).toEqual({
      is_recurring: false,
      is_extraordinary: true,
    });
    expect(deriveCategoryFlags(categories[0]!)).toEqual({
      is_recurring: false,
      is_extraordinary: false,
    });
  });

  it("applies suggested category from AI slug", () => {
    const result = applyAiClassification(
      needsReview,
      {
        id: "0",
        category_slug: "comida",
      },
      categories
    );

    expect(result.category_id).toBe("cat-food");
    expect(result.transaction_type).toBe("expense");
    expect(result.is_recurring).toBe(false);
    expect(result.is_extraordinary).toBe(false);
    expect(result.categorization_status).toBe("suggested");
  });

  it("marks travel categories as extraordinary", () => {
    const result = applyAiClassification(
      needsReview,
      {
        id: "0",
        category_slug: "viajes",
      },
      categories
    );

    expect(result.category_id).toBe("cat-travel");
    expect(result.is_extraordinary).toBe(true);
  });

  it("maps AI otros slug to needs review without category", () => {
    const result = applyAiClassification(
      needsReview,
      {
        id: "0",
        category_slug: "otros",
      },
      categories
    );

    expect(result.category_id).toBeNull();
    expect(result.categorization_status).toBe("needs_review");
  });

  it("rescues AI otros with merchant heuristics when description is provided", () => {
    const result = applyAiClassification(
      needsReview,
      {
        id: "0",
        category_slug: "otros",
      },
      categories,
      "DLO PEDIDOSYA WANTAN"
    );

    expect(result.category_id).toBe("cat-food");
    expect(result.categorization_status).toBe("suggested");
  });

  it("guesses credit card merchant categories", () => {
    expect(guessCategoryFromDescription("DLO PEDIDOSYA WANTAN", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("PAYU AR UBER", categories)?.slug).toBe("transporte");
    expect(guessCategoryFromDescription("JETSMART AIRLINES", categories)?.slug).toBe("viajes");
    expect(guessCategoryFromDescription("RAILWAY", categories)?.slug).toBe("suscripciones");
    expect(guessCategoryFromDescription("CULTO COMPARSITA", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("PURO SURF ACAD BP", categories)?.slug).toBe("ocio-compras");
    expect(guessCategoryFromDescription("SEGURO SALDO DEUDOR", categories)?.slug).toBe("servicios");
  });

  it("guesses Uruguay debit merchants from bank exports", () => {
    expect(guessCategoryFromDescription("CONFITERIA MAJARK", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("KIOSKO LADY SWEET", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("LA MADRIGUERA HELADO", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("DELISHOP ALMA.HANDY.", categories)?.slug).toBe("comida");
    expect(guessCategoryFromDescription("FARMASHOP 42 VISA", categories)?.slug).toBe("salud-deporte");
    expect(guessCategoryFromDescription("MOSCA HNOS", categories)?.slug).toBe("ocio-compras");
  });

  it("does not map unknown AI slugs to otros", () => {
    const result = applyAiClassification(
      needsReview,
      {
        id: "0",
        category_slug: "unknown-category",
      },
      categories
    );

    expect(result.category_id).toBeNull();
    expect(result.categorization_status).toBe("needs_review");
  });

  it("upgrades otros suggestions using merchant heuristics", () => {
    const result = upgradeExpenseCategory(
      {
        ...needsReview,
        category_id: "cat-other",
        categorization_status: "suggested",
      },
      "COMPRA CON TARJETA DEBITO DECATHLON",
      categories
    );

    expect(result.category_id).toBe("cat-shopping");
    expect(result.categorization_status).toBe("suggested");
  });

  it("keeps uncategorized expenses in needs review when no merchant match", () => {
    const result = ensureSuggestedExpenseCategory(
      needsReview,
      "COMPRA DESCONOCIDA XYZ",
      categories,
      -50
    );

    expect(result.category_id).toBeNull();
    expect(result.categorization_status).toBe("needs_review");
  });

  it("promotes uncategorized expenses with merchant match to suggested", () => {
    const result = ensureSuggestedExpenseCategory(
      needsReview,
      "COMPRA DECATHLON MONTEVIDEO",
      categories,
      -50
    );

    expect(result.category_id).toBe("cat-shopping");
    expect(result.categorization_status).toBe("suggested");
  });

  it("treats suggested otros as needs review unless merchant match exists", () => {
    const suggestedOtros = {
      category_id: "cat-other",
      normalized_description: "COMPRA DESCONOCIDA XYZ",
      excluded_from_spending: false,
      amount: -50,
    };

    expect(hasConfidentCategory(suggestedOtros, categories)).toBe(false);
    expect(isNeedsReviewForImport("suggested", suggestedOtros, categories)).toBe(true);
    expect(isSuggestedByAiForImport("suggested", suggestedOtros, categories)).toBe(false);
  });

  it("does not count income as needing user help", () => {
    expect(
      transactionNeedsUserHelp({
        categorization_status: "auto",
        category_id: null,
        amount: 5000,
        transaction_type: "income",
        excluded_from_spending: false,
      })
    ).toBe(false);
  });
});
