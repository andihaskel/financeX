"use client";

import { EyeOff } from "lucide-react";

import { useIncognito } from "@/lib/privacy/incognito-context";
import { cn } from "@/lib/utils";

export function IncognitoSettingsToggle() {
  const { incognito, toggleIncognito } = useIncognito();

  return (
    <button
      type="button"
      onClick={toggleIncognito}
      className="flex w-full items-center gap-2 py-4 text-left"
    >
      <EyeOff className="size-5 shrink-0 text-[#6E6B82]" aria-hidden />
      <span className="text-sm font-bold">Incognito mode</span>
      <span className="text-[13px] font-semibold text-[#6E6B82]">
        {incognito ? "On — amounts blurred" : "Off"}
      </span>
      <span
        className={cn(
          "ml-auto h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
          incognito ? "bg-[#6C3FD1]" : "bg-[#E2DEF0]"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-white shadow transition-transform",
            incognito ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}
