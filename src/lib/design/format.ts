export function formatMoney(amount: number): string {
  return (
    (amount < 0 ? "-$" : "$") +
    Math.abs(Math.round(amount)).toLocaleString("en-US")
  );
}

export function formatSignedDelta(amount: number): string {
  return (amount >= 0 ? "+$" : "-$") + Math.abs(Math.round(amount)).toLocaleString("en-US");
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatTransactionAmount(amount: number, currency: "USD" | "UYU"): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString("en-US");
  const sign = amount < 0 ? "-" : amount > 0 ? "+" : "";

  if (currency === "UYU") {
    return `${sign}UYU ${formatted}`;
  }

  return `${sign}$${formatted} USD`;
}
