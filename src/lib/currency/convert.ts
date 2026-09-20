import type { Currency } from "@/types/database";

/**
 * Convert an amount to USD for consolidated reporting.
 * uyuToUsdRate represents how many UYU equal 1 USD (default: 40).
 */
export function convertToUsd(
  amount: number,
  currency: Currency,
  uyuToUsdRate: number
): number {
  if (currency === "USD") return amount;
  if (uyuToUsdRate <= 0) return amount;
  return amount / uyuToUsdRate;
}

export function formatCurrency(
  amount: number,
  currency: Currency = "USD",
  options?: { compact?: boolean }
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: currency === "UYU" ? 0 : 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
