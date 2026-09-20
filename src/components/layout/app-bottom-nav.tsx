"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  appNavItems,
  isNavActive,
  settingsNavItem,
} from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function AppBottomNav() {
  const pathname = usePathname();
  const settingsActive = isNavActive(pathname, settingsNavItem.match);
  const SettingsIcon = settingsNavItem.icon;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around bg-white px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(28,27,41,0.08)] md:hidden">
      {appNavItems.map((item) => {
        const active = isNavActive(pathname, item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5",
              active ? "text-[#6C3FD1]" : "text-[#6E6B82]"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "truncate text-[10px]",
                active ? "font-bold" : "font-semibold"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      <Link
        href={settingsNavItem.href}
        prefetch
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5",
          settingsActive ? "text-[#6C3FD1]" : "text-[#6E6B82]"
        )}
      >
        <SettingsIcon className="h-5 w-5 shrink-0" />
        <span
          className={cn(
            "truncate text-[10px]",
            settingsActive ? "font-bold" : "font-semibold"
          )}
        >
          {settingsNavItem.label}
        </span>
      </Link>
    </nav>
  );
}
