"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getShellFinanceData } from "@/app/actions/shell";
import type { Account, Category } from "@/types/database";

type ShellFinance = {
  accounts: Account[];
  categories: Category[];
  ready: boolean;
};

const ShellFinanceContext = createContext<ShellFinance>({
  accounts: [],
  categories: [],
  ready: false,
});

export function ShellFinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShellFinance>({
    accounts: [],
    categories: [],
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    getShellFinanceData()
      .then((data) => {
        if (!cancelled) {
          setState({ ...data, ready: true });
        }
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, ready: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ShellFinanceContext.Provider value={state}>{children}</ShellFinanceContext.Provider>
  );
}

export function useShellFinance() {
  return useContext(ShellFinanceContext);
}
