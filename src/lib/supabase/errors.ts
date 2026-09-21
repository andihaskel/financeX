import type { PostgrestError } from "@supabase/supabase-js";

export const TRANSACTION_WITH_RELATIONS_SELECT =
  '*, accounts!transactions_account_id_fkey(id, name, type, currency), categories(id, name, slug, "group")';

function errorPart(value: unknown): string | null {
  if (value == null) return null;
  const text = typeof value === "string" ? value : String(value);
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}

export function formatSupabaseError(error: PostgrestError | null | undefined): string {
  if (!error) return "Unknown database error";

  const parts = [error.message, error.details, error.hint, error.code]
    .map(errorPart)
    .filter((part): part is string => Boolean(part));

  return parts.join(" · ") || "Unknown database error";
}

export function isMissingColumnError(error: PostgrestError | null | undefined): boolean {
  const text = formatSupabaseError(error).toLowerCase();
  return text.includes("column") && text.includes("does not exist");
}
