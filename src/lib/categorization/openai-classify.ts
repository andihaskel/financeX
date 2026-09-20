import type { CategorizationResult } from "@/lib/categorization/categorize";
import { getOpenAiApiKey, OPENAI_CLASSIFY_MODEL } from "@/lib/openai/env";
import type { Category, CategorizationStatus, TransactionType } from "@/types/database";

const BATCH_SIZE = 25;

const SLUG_ALIASES: Record<string, string> = {
  comida: "comida",
  food: "comida",
  restaurant: "comida",
  supermarket: "comida",
  transporte: "transporte",
  transport: "transporte",
  uber: "transporte",
  vivienda: "vivienda",
  rent: "vivienda",
  alquiler: "vivienda",
  salud: "salud-deporte",
  deporte: "salud-deporte",
  "salud-deporte": "salud-deporte",
  servicios: "servicios",
  suscripciones: "suscripciones",
  subscription: "suscripciones",
  ocio: "ocio-compras",
  compras: "ocio-compras",
  shopping: "ocio-compras",
  "ocio-compras": "ocio-compras",
  viajes: "viajes",
  travel: "viajes",
  donaciones: "donaciones-regalos",
  regalos: "donaciones-regalos",
  "donaciones-regalos": "donaciones-regalos",
  impuestos: "impuestos-profesionales",
  profesionales: "impuestos-profesionales",
  "impuestos-profesionales": "impuestos-profesionales",
  otros: "otros",
  other: "otros",
  misc: "otros",
};

export interface AiClassifyInput {
  id: string;
  description: string;
  normalized_description: string;
  amount: number;
  currency: string;
}

export interface AiClassifyResult {
  id: string;
  category_slug: string | null;
}

interface OpenAiClassifyResponse {
  classifications: Array<{
    id: string;
    category_slug: string | null;
  }>;
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function getOtrosCategory(categories: Category[]): Category | null {
  return categories.find((category) => normalizeToken(category.slug) === "otros") ?? null;
}

export function deriveCategoryFlags(category: Category): Pick<
  CategorizationResult,
  "is_recurring" | "is_extraordinary"
> {
  return {
    is_recurring: false,
    is_extraordinary: category.group === "extraordinary",
  };
}

export function resolveCategory(
  slugOrName: string | null | undefined,
  categories: Category[]
): Category | null {
  if (!slugOrName) return null;

  const token = normalizeToken(slugOrName);
  const alias = SLUG_ALIASES[token];
  const bySlug = new Map(categories.map((category) => [normalizeToken(category.slug), category]));
  const byName = new Map(categories.map((category) => [normalizeToken(category.name), category]));

  if (alias && bySlug.has(alias)) return bySlug.get(alias)!;
  if (bySlug.has(token)) return bySlug.get(token)!;
  if (byName.has(token)) return byName.get(token)!;

  for (const category of categories) {
    const slug = normalizeToken(category.slug);
    const name = normalizeToken(category.name);
    if (token.includes(slug) || slug.includes(token) || token.includes(name)) {
      return category;
    }
  }

  return null;
}

const MERCHANT_CATEGORY_PATTERNS: Array<{ pattern: RegExp; slug: string }> = [
  {
    pattern:
      /PEDIDOSYA|RAPPI|DISCO|TATA|DEVOTO|MACRO|CARREFOUR|TIENDA INGLESA|DLO PEDIDOSYA|DLO LINEUP|WANTAN|EMPANADA|SALADBOW|PROPINA|RAMONA|POSTA DEL CAFE|VITI|ZOTTELE|BIRKIN|DICKEN|COMPARSITA|CULTO|CANELONES|LUBART|BABILONIA|EL NORTE|RESTAUR|CONFITERIA|KIOSKO|KIOSCO|HELADO|DELISHOP|MINIMARKET|CAFE|CAFÉ|BAR |SUSHI|PIZZA|BURGER|MCDONALD|MERPAGO|PATAGONIA FOOD|RUDY BUR|MARKET/i,
    slug: "comida",
  },
  {
    pattern:
      /DECATHLON|ZARA|H&M|SHOPPING|FALABELLA|NIKE|ADIDAS|PRIMARK|MOVIE|APRES|ARTLAB|ART LAB|ALPARAMIS|FONDO DE CULTURA|JAKSON|BOLIVIA COSTA|PURO SURF|AGENCIA CENTRAL|MOSCA HNOS|MOSCA /i,
    slug: "ocio-compras",
  },
  {
    pattern: /FARMACITY|FARMASHOP|FARMACIA(?!\s+CAFE)|OSDE|BLUECROSS|GYM|DEPORT/i,
    slug: "salud-deporte",
  },
  {
    pattern: /UBER|CABIFY|OXEN|PEAJE|TAXI|SUBTE|BUS |PAYU|DLO UBER|UBVUYUYUDLOCALRIDES|YPF/i,
    slug: "transporte",
  },
  {
    pattern: /SPOTIFY|NETFLIX|AMAZON PRIME|GOOGLE ONE|YOUTUBE|APPLE\.COM|DISNEY\+|RAILWAY|SUNO/i,
    slug: "suscripciones",
  },
  {
    pattern:
      /COMISION|COMISI[OÓ]N|MANTENIMIENTO|ANTEL|OSE|UTE|BANRED|SERVICIO DE PAGOS|SEGURO/i,
    slug: "servicios",
  },
  { pattern: /COPA|JETSMART|AEROLINE|HOTEL|AIRBNB|BOOKING/i, slug: "viajes" },
  { pattern: /ROCIO VELASCO|ALQUILER|INMOBILI/i, slug: "vivienda" },
  { pattern: /CONTADOR|ABOGAD|IMPUESTO|DGI|BPS|IMMONT|IMM /i, slug: "impuestos-profesionales" },
  { pattern: /REGALO|DONACI[OÓ]N/i, slug: "donaciones-regalos" },
];

export function guessCategoryFromDescription(
  description: string,
  categories: Category[]
): Category | null {
  const text = description.toUpperCase();
  const bySlug = new Map(categories.map((category) => [category.slug, category]));

  for (const { pattern, slug } of MERCHANT_CATEGORY_PATTERNS) {
    if (!pattern.test(text)) continue;
    const category = bySlug.get(slug);
    if (category) return category;
  }

  return null;
}

export function guessCategoryFromTexts(
  texts: Array<string | null | undefined>,
  categories: Category[]
): Category | null {
  for (const text of texts) {
    if (!text) continue;
    const guessed = guessCategoryFromDescription(text, categories);
    if (guessed) return guessed;
  }
  return null;
}

export function hasConfidentCategory(
  transaction: { category_id: string | null; normalized_description: string },
  categories: Category[]
): boolean {
  if (!transaction.category_id) {
    return false;
  }

  const otros = getOtrosCategory(categories);
  if (otros && transaction.category_id === otros.id) {
    return guessCategoryFromDescription(transaction.normalized_description, categories) !== null;
  }

  return true;
}

export function isNeedsReviewForImport(
  status: CategorizationStatus,
  transaction: {
    category_id: string | null;
    normalized_description: string;
    excluded_from_spending: boolean;
    amount: number;
  },
  categories: Category[]
): boolean {
  if (status === "auto" || transaction.excluded_from_spending || transaction.amount > 0) {
    return false;
  }

  if (status === "needs_review") {
    return true;
  }

  if (status === "suggested") {
    return !hasConfidentCategory(transaction, categories);
  }

  return false;
}

export function isSuggestedByAiForImport(
  status: CategorizationStatus,
  transaction: {
    category_id: string | null;
    normalized_description: string;
    excluded_from_spending: boolean;
    amount: number;
  },
  categories: Category[]
): boolean {
  if (status !== "suggested" || transaction.excluded_from_spending || transaction.amount > 0) {
    return false;
  }

  return hasConfidentCategory(transaction, categories);
}

export function ensureSuggestedExpenseCategory(
  categorization: CategorizationResult,
  description: string,
  categories: Category[],
  amount: number
): CategorizationResult {
  if (
    categorization.categorization_status === "auto" ||
    categorization.excluded_from_spending ||
    amount >= 0 ||
    categorization.category_id
  ) {
    return categorization;
  }

  if (
    categorization.transaction_type === "transfer" ||
    categorization.transaction_type === "credit_card_payment"
  ) {
    return categorization;
  }

  const category = guessCategoryFromDescription(description, categories);
  if (!category) {
    return categorization;
  }

  return {
    ...categorization,
    transaction_type: "expense",
    category_id: category.id,
    ...deriveCategoryFlags(category),
    categorization_status: "suggested",
    categorization_rule_id: null,
  };
}

export function upgradeExpenseCategory(
  categorization: CategorizationResult,
  description: string,
  categories: Category[]
): CategorizationResult {
  if (categorization.categorization_status === "auto" || categorization.excluded_from_spending) {
    return categorization;
  }

  const otros = getOtrosCategory(categories);
  const shouldUpgrade =
    !categorization.category_id ||
    (otros !== null && categorization.category_id === otros.id);

  if (!shouldUpgrade) {
    return categorization;
  }

  const guessed = guessCategoryFromDescription(description, categories);
  if (!guessed || (otros && guessed.id === otros.id)) {
    return categorization;
  }

  return {
    ...categorization,
    transaction_type: "expense",
    category_id: guessed.id,
    ...deriveCategoryFlags(guessed),
    categorization_status: "suggested",
    categorization_rule_id: null,
  };
}

export function applyAiClassification(
  categorization: CategorizationResult,
  ai: AiClassifyResult | undefined,
  categories: Category[],
  description?: string
): CategorizationResult {
  if (categorization.categorization_status === "auto" || categorization.excluded_from_spending) {
    return categorization;
  }

  if (!ai?.category_slug) {
    return categorization;
  }

  const category = resolveCategory(ai.category_slug, categories);
  const otros = getOtrosCategory(categories);

  if (!category || (otros && category.id === otros.id)) {
    const guessed = description
      ? guessCategoryFromDescription(description, categories)
      : null;
    if (guessed && (!otros || guessed.id !== otros.id)) {
      return {
        transaction_type: "expense",
        category_id: guessed.id,
        excluded_from_spending: categorization.excluded_from_spending,
        ...deriveCategoryFlags(guessed),
        categorization_status: "suggested",
        categorization_rule_id: null,
      };
    }

    // Keep "otros"/unknown as needs review without a preloaded category
    return {
      ...categorization,
      transaction_type: "expense",
      category_id: null,
      excluded_from_spending: categorization.excluded_from_spending,
      is_recurring: false,
      is_extraordinary: false,
      categorization_status: "needs_review",
      categorization_rule_id: null,
    };
  }

  return {
    transaction_type: "expense",
    category_id: category.id,
    excluded_from_spending: categorization.excluded_from_spending,
    ...deriveCategoryFlags(category),
    categorization_status: "suggested",
    categorization_rule_id: null,
  };
}

export function shouldClassifyWithAi(categorization: CategorizationResult, amount: number): boolean {
  if (categorization.categorization_status === "auto" || categorization.excluded_from_spending) {
    return false;
  }

  if (amount > 0) {
    return false;
  }

  return categorization.category_id === null;
}

export function finalizeAutomaticRows(
  categorization: CategorizationResult,
  amount: number
): CategorizationResult {
  if (categorization.categorization_status === "auto" || categorization.excluded_from_spending) {
    return categorization;
  }

  if (amount > 0) {
    return {
      transaction_type: "income",
      category_id: null,
      excluded_from_spending: false,
      is_recurring: false,
      is_extraordinary: false,
      categorization_status: "auto",
      categorization_rule_id: null,
    };
  }

  return categorization;
}

export function transactionNeedsUserHelp(row: {
  categorization_status: CategorizationResult["categorization_status"];
  category_id: string | null;
  amount: number;
  transaction_type: TransactionType;
  excluded_from_spending: boolean;
}): boolean {
  if (row.excluded_from_spending || row.categorization_status === "auto") {
    return false;
  }

  if (row.amount > 0 && row.transaction_type === "income") {
    return false;
  }

  if (row.categorization_status === "needs_review") {
    return true;
  }

  if (row.categorization_status === "suggested") {
    return row.transaction_type === "expense" || row.transaction_type === "refund";
  }

  return false;
}

function buildCategoryPrompt(categories: Category[]) {
  return categories
    .map((category) => `- slug: "${category.slug}" | name: ${category.name} | group: ${category.group}`)
    .join("\n");
}

const PRIMARY_PROMPT = `You classify Santander household bank/card expenses for a personal budget app in Uruguay.
Return JSON only: {"classifications":[{"id":"...","category_slug":"exact-slug"}]}

You MUST return one classification object for EVERY transaction id in the input.

Rules:
- Input contains expenses only (negative amounts). Pick the best matching category_slug from the list.
- Prefer a specific category over "otros". Only use slug "otros" when nothing else reasonably fits.
- Never return null category_slug.
- Credit card exports often use short merchant names. Examples:
  DLO PEDIDOSYA / DISCO / TATA / MERPAGO / CONFITERIA / KIOSKO / HELADO / DELISHOP -> comida
  ZARA / MOVIE / ART LAB / JAKSON / MOSCA -> ocio-compras
  PAYU AR UBER / DLO UBER / YPF -> transporte
  SPOTIFY / AMAZON PRIME / RAILWAY / SUNO -> suscripciones
  AIRBNB / JETSMART / COPA -> viajes
  FARMASHOP / FARMACITY -> salud-deporte
  BANRED / UTE / ANTEL -> servicios
  BPS / IMM -> impuestos-profesionales
- Bank examples: COMISION TRANSF -> servicios; ROCIO VELASCO/rent -> vivienda.
- Do NOT classify TRANSFERENCIA ENVIADA / TRF. PLAZA / PAGO ELECTRONICO TARJETA CREDITO (those are handled outside AI).

Categories (use slug exactly as written):
`;

const FALLBACK_PROMPT = `You classify remaining household expenses. Every transaction MUST get a category_slug from the list.
Return JSON only: {"classifications":[{"id":"...","category_slug":"exact-slug"}]}

Rules:
- Pick the closest category for each expense. Never return null.
- Avoid slug "otros". Prefer the nearest specific category even with low confidence.
- Food/restaurants/delivery/tips -> comida
- Stores/entertainment/surf/shops -> ocio-compras
- Rides/fuel/parking -> transporte
- Streaming/software/apps -> suscripciones
- Flights/hotels/airbnb -> viajes
- Return one row per input id.

Categories:
`;

const AGGRESSIVE_PROMPT = `Force-classify every remaining expense with a specific category_slug from the list.
Return JSON only: {"classifications":[{"id":"...","category_slug":"exact-slug"}]}

Rules:
- NEVER use "otros".
- NEVER return null.
- Always pick the closest slug from the list.
- Return one row per input id.

Categories:
`;

export async function classifyTransactionsWithOpenAi(
  items: AiClassifyInput[],
  categories: Category[]
): Promise<Map<string, AiClassifyResult>> {
  const results = new Map<string, AiClassifyResult>();
  const apiKey = getOpenAiApiKey();

  if (!apiKey || items.length === 0 || categories.length === 0) {
    return results;
  }

  const categoryPrompt = buildCategoryPrompt(categories);
  const expenseItems = items.filter((item) => item.amount < 0);
  const otrosSlug = getOtrosCategory(categories)?.slug ?? "otros";

  await runBatches(expenseItems, PRIMARY_PROMPT + categoryPrompt, apiKey, results);

  const missingOrOtros = expenseItems.filter((item) => {
    const slug = results.get(item.id)?.category_slug;
    return !slug || slug === otrosSlug;
  });

  if (missingOrOtros.length > 0) {
    await runBatches(missingOrOtros, FALLBACK_PROMPT + categoryPrompt, apiKey, results);
  }

  const stillWeak = expenseItems.filter((item) => {
    const slug = results.get(item.id)?.category_slug;
    return !slug || slug === otrosSlug;
  });

  if (stillWeak.length > 0) {
    await runBatches(stillWeak, AGGRESSIVE_PROMPT + categoryPrompt, apiKey, results);
  }

  for (const item of expenseItems) {
    const existing = results.get(item.id);
    const existingSlug = existing?.category_slug;

    if (existingSlug && existingSlug !== otrosSlug) continue;

    const guessed = guessCategoryFromTexts(
      [item.normalized_description, item.description],
      categories
    );
    if (guessed && guessed.slug !== otrosSlug) {
      results.set(item.id, { id: item.id, category_slug: guessed.slug });
    }
  }

  return results;
}

async function runBatches(
  items: AiClassifyInput[],
  systemPrompt: string,
  apiKey: string,
  results: Map<string, AiClassifyResult>
) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await classifyBatch(batch, systemPrompt, apiKey);

    for (const entry of batchResults) {
      results.set(entry.id, entry);
    }

    const missingIds = batch
      .map((item) => item.id)
      .filter((id) => !batchResults.some((entry) => entry.id === id));

    if (missingIds.length > 0) {
      const retryItems = batch.filter((item) => missingIds.includes(item.id));
      const retryResults = await classifyBatch(retryItems, systemPrompt, apiKey);
      for (const entry of retryResults) {
        results.set(entry.id, entry);
      }
    }
  }
}

async function classifyBatch(
  items: AiClassifyInput[],
  systemPrompt: string,
  apiKey: string
): Promise<AiClassifyResult[]> {
  if (items.length === 0) return [];

  const payload = items.map((item) => ({
    id: item.id,
    description: item.description,
    normalized_description: item.normalized_description,
    amount: item.amount,
    currency: item.currency,
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_CLASSIFY_MODEL,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({ transactions: payload }),
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("OpenAI classify failed", response.status, await response.text());
    return [];
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as OpenAiClassifyResponse;
    return (parsed.classifications ?? []).map((entry) => ({
      id: String(entry.id),
      category_slug: entry.category_slug,
    }));
  } catch {
    console.error("OpenAI classify returned invalid JSON");
    return [];
  }
}
