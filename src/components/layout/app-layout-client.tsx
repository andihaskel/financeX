"use client";

import { Suspense } from "react";

import { ImportDialogProvider } from "@/components/import/import-dialog-store";
import { AddMovementsDialog } from "@/components/import/add-movements-dialog";
import { OpenImportOnQuery } from "@/components/import/open-import-on-query";
import { IncognitoBanner, IncognitoToggleFab } from "@/components/privacy/incognito-chrome";
import { AppShell } from "@/components/layout/app-shell";
import { IncognitoProvider } from "@/lib/privacy/incognito-context";
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
    <IncognitoProvider>
      <ShellFinanceProvider>
        <ImportDialogProvider>
          <AppShell>
            <IncognitoBanner />
            {children}
            <AddMovementsDialogConnected />
            <Suspense>
              <OpenImportOnQuery />
            </Suspense>
          </AppShell>
          <IncognitoToggleFab />
        </ImportDialogProvider>
      </ShellFinanceProvider>
    </IncognitoProvider>
  );
}
