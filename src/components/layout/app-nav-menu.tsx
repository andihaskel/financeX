"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  appNavItems,
  isNavActive,
  settingsNavItem,
} from "@/components/layout/nav-items";
import { fx } from "@/lib/design/fx-classes";
import { cn } from "@/lib/utils";

const linkClassName = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[15px] transition-colors",
    active ? fx.activeNav : fx.navItem
  );

export function AppNavMenu({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {appNavItems.map((item) => {
        const active = isNavActive(pathname, item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            className={linkClassName(active)}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNavSettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isNavActive(pathname, settingsNavItem.match);
  const SettingsIcon = settingsNavItem.icon;

  return (
    <Link
      href={settingsNavItem.href}
      prefetch
      onClick={onNavigate}
      className={linkClassName(active)}
    >
      <SettingsIcon className="h-5 w-5" />
      {settingsNavItem.label}
    </Link>
  );
}
