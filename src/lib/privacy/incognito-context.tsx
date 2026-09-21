"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "financex-incognito";

type IncognitoContextValue = {
  incognito: boolean;
  setIncognito: (value: boolean) => void;
  toggleIncognito: () => void;
};

const IncognitoContext = createContext<IncognitoContextValue | null>(null);

const listeners = new Set<() => void>();

function emitIncognitoChange() {
  listeners.forEach((listener) => listener());
}

function subscribeIncognito(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStoredIncognito(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getIncognitoSnapshot(): boolean {
  return readStoredIncognito();
}

function getIncognitoServerSnapshot(): boolean {
  return false;
}

function persistIncognito(value: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

function syncDocumentIncognito(value: boolean) {
  if (typeof document === "undefined") return;
  if (value) {
    document.documentElement.dataset.incognito = "true";
  } else {
    delete document.documentElement.dataset.incognito;
  }
}

export function IncognitoProvider({ children }: { children: ReactNode }) {
  const incognito = useSyncExternalStore(
    subscribeIncognito,
    getIncognitoSnapshot,
    getIncognitoServerSnapshot
  );

  useEffect(() => {
    syncDocumentIncognito(incognito);
  }, [incognito]);

  const setIncognito = useCallback((value: boolean) => {
    persistIncognito(value);
    syncDocumentIncognito(value);
    emitIncognitoChange();
  }, []);

  const toggleIncognito = useCallback(() => {
    setIncognito(!readStoredIncognito());
  }, [setIncognito]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "i" || !event.shiftKey || event.metaKey || event.ctrlKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      toggleIncognito();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleIncognito]);

  const value = useMemo(
    () => ({ incognito, setIncognito, toggleIncognito }),
    [incognito, setIncognito, toggleIncognito]
  );

  return <IncognitoContext.Provider value={value}>{children}</IncognitoContext.Provider>;
}

export function useIncognito() {
  const ctx = useContext(IncognitoContext);
  if (!ctx) {
    throw new Error("useIncognito must be used within IncognitoProvider");
  }
  return ctx;
}
