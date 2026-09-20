export function accountDotColor(shortLabel: string): string {
  const label = shortLabel.toUpperCase();
  if (label === "CARD" || label.includes("TARJ")) return "#1C1B29";
  if (label === "UYU") return "#3B82F6";
  if (label === "USD") return "#10B981";
  return "#9E9AB0";
}
