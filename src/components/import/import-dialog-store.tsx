"use client";

import { createContext, useContext, useState } from "react";

interface ImportDialogContextValue {
  isOpen: boolean;
  month?: string;
  accountId?: string;
  open: (options?: { month?: string; accountId?: string }) => void;
  close: () => void;
}

const ImportDialogContext = createContext<ImportDialogContextValue | null>(null);

export function ImportDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState<string | undefined>();
  const [accountId, setAccountId] = useState<string | undefined>();

  return (
    <ImportDialogContext.Provider
      value={{
        isOpen,
        month,
        accountId,
        open: (options) => {
          setMonth(options?.month);
          setAccountId(options?.accountId);
          setIsOpen(true);
        },
        close: () => {
          setIsOpen(false);
          setMonth(undefined);
          setAccountId(undefined);
        },
      }}
    >
      {children}
    </ImportDialogContext.Provider>
  );
}

export function useImportDialog() {
  const ctx = useContext(ImportDialogContext);
  if (!ctx) throw new Error("useImportDialog must be used within ImportDialogProvider");
  return ctx;
}
