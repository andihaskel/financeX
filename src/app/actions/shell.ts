"use server";

import { getAccounts, getCategories } from "@/lib/queries/finance";

export async function getShellFinanceData() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return { accounts, categories };
}
