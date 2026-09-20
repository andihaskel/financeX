import { getCategoryVisual } from "@/lib/design/theme";

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function slicesFromCategories(
  rows: { name: string; slug: string; amount: number }[]
): DonutSlice[] {
  return rows.map((row) => {
    const visual = getCategoryVisual(row.slug);
    return {
      name: row.name,
      value: row.amount,
      color: visual.chipColor,
    };
  });
}

export function slicesFromBudgetRows(
  rows: { name: string; slug: string; actual: number }[]
): DonutSlice[] {
  return rows.map((row) => {
    const visual = getCategoryVisual(row.slug);
    return {
      name: row.name,
      value: row.actual,
      color: visual.chipColor,
    };
  });
}
