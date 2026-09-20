import type { Category, CategoryGroup, TransactionType } from "@/types/database";

export function isIncomeCategoryGroup(group: CategoryGroup | string | null | undefined) {
  return group === "income";
}

export function isSpendingCategory(category: Pick<Category, "group">) {
  return !isIncomeCategoryGroup(category.group);
}

export function spendingCategories<T extends Pick<Category, "group">>(categories: T[]) {
  return categories.filter(isSpendingCategory);
}

export function incomeCategories<T extends Pick<Category, "group">>(categories: T[]) {
  return categories.filter((category) => isIncomeCategoryGroup(category.group));
}

export function categoriesForTransactionType<T extends Pick<Category, "group">>(
  categories: T[],
  type: TransactionType
) {
  if (type === "income") return incomeCategories(categories);
  if (type === "expense" || type === "refund") return spendingCategories(categories);
  return [];
}

export function typeNeedsCategory(type: TransactionType) {
  return type === "expense" || type === "refund" || type === "income";
}
