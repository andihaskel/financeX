"use client";

import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { AppNavSettingsLink } from "@/components/layout/app-nav-menu";
import { useIncognito } from "@/lib/privacy/incognito-context";
import { fx } from "@/lib/design/fx-classes";
import { cn } from "@/lib/utils";

function NavSwitchRow({
  icon: Icon,
  label,
  pressed,
  onToggle,
  ariaLabel,
}: {
  icon: typeof Eye;
  label: string;
  pressed: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-[14px] bg-transparent px-3.5 py-2.5 text-left transition-colors hover:bg-fx-accent-soft/80 dark:bg-transparent"
      aria-pressed={pressed}
      aria-label={ariaLabel}
    >
      <Icon className={cn("size-5 shrink-0", fx.subtle)} aria-hidden />
      <span className={cn("text-[15px] font-medium", fx.muted)}>{label}</span>
      <span
        className={cn(
          "ml-auto h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
          pressed ? "bg-fx-accent" : "bg-fx-line-strong"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-fx-surface shadow transition-transform",
            pressed ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}

function NavIncognitoToggle() {
  const { incognito, toggleIncognito } = useIncognito();
  const Icon = incognito ? EyeOff : Eye;

  return (
    <NavSwitchRow
      icon={Icon}
      label="Incognito"
      pressed={incognito}
      onToggle={toggleIncognito}
      ariaLabel={incognito ? "Turn off incognito mode" : "Turn on incognito mode"}
    />
  );
}

function NavThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <NavSwitchRow
      icon={Icon}
      label="Dark mode"
      pressed={isDark}
      onToggle={() => setTheme(isDark ? "light" : "dark")}
      ariaLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
    />
  );
}

export function AppNavFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-1 border-t border-fx-line pt-4">
      <NavIncognitoToggle />
      <NavThemeToggle />
      <AppNavSettingsLink onNavigate={onNavigate} />
    </div>
  );
}
