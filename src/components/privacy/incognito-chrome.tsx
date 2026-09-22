"use client";

import { fx } from "@/lib/design/fx-classes";
import { useIncognito } from "@/lib/privacy/incognito-context";

export function IncognitoBanner() {
  const { incognito, setIncognito } = useIncognito();

  if (!incognito) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-fx-line bg-fx-surface px-4 py-3 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className={`text-sm font-extrabold ${fx.ink}`}>Incognito mode</p>
        <p className={`text-xs font-semibold ${fx.muted}`}>
          Amounts and numbers are blurred for screen sharing.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIncognito(false)}
        className={`shrink-0 rounded-[12px] bg-fx-accent-soft px-3.5 py-2 text-xs font-bold ${fx.accent} transition-colors hover:opacity-90`}
      >
        Turn off
      </button>
    </div>
  );
}
