"use client";

import { Suspense } from "react";

import { ImportDialogProvider } from "@/components/import/import-dialog-store";
import { AddMovementsDialog } from "@/components/import/add-movements-dialog";
import { OpenImportOnQuery } from "@/components/import/open-import-on-query";
import { AppShell } from "@/components/layout/app-shell";
import {
  ShellFinanceProvider,
  useShellFinance,
} from "@/components/layout/shell-finance";

function AddMovementsDialogConnected() {
  const { accounts, categories } = useShellFinance();
  return <AddMovementsDialog accounts={accounts} categories={categories} />;
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ShellFinanceProvider>
      <ImportDialogProvider>
        <AppShell>
          {children}
          <AddMovementsDialogConnected />
          <Suspense>
            <OpenImportOnQuery />
          </Suspense>
        </AppShell>
      </ImportDialogProvider>
    </ShellFinanceProvider>
  );
}
