export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export const OPENAI_CLASSIFY_MODEL =
  process.env.OPENAI_CLASSIFY_MODEL?.trim() || "gpt-4o-mini";
