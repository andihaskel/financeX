"use client";

import { Eye, EyeOff } from "lucide-react";

import { useIncognito } from "@/lib/privacy/incognito-context";
import { cn } from "@/lib/utils";

export function IncognitoBanner() {
  const { incognito, setIncognito } = useIncognito();

  if (!incognito) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E2DEF0] bg-white px-4 py-3 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#1C1B29]">Incognito mode</p>
        <p className="text-xs font-semibold text-[#6E6B82]">
          Amounts and numbers are blurred for screen sharing.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIncognito(false)}
        className="shrink-0 rounded-[12px] bg-[#F3F1F9] px-3.5 py-2 text-xs font-bold text-[#6C3FD1] transition-colors hover:bg-[#E8E4F4]"
      >
        Turn off
      </button>
    </div>
  );
}

export function IncognitoToggleFab() {
  const { incognito, toggleIncognito } = useIncognito();
  const Icon = incognito ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={toggleIncognito}
      className={cn(
        "fixed z-[60] flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_4px_20px_rgba(28,27,41,0.12)] transition-colors",
        "right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] md:bottom-6 md:right-8",
        incognito
          ? "border-[#6C3FD1] bg-[#6C3FD1] text-white hover:bg-[#5A32B8]"
          : "border-[#E2DEF0] bg-white text-[#6E6B82] hover:bg-[#FAF9FC] hover:text-[#6C3FD1]"
      )}
      aria-pressed={incognito}
      aria-label={incognito ? "Turn off incognito mode" : "Turn on incognito mode"}
      title={incognito ? "Incognito on (Shift+I)" : "Incognito off (Shift+I)"}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
