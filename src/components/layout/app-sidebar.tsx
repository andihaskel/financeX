"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { appNavItems, isNavActive } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col bg-white px-5 py-7 shadow-[1px_0_0_rgba(28,27,41,0.06)] md:flex">
      <Link href="/apps" className="mb-8 flex items-center gap-2.5 px-2 hover:opacity-80">
        <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
        <span className="text-lg font-extrabold text-[#1C1B29]">financeX</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {appNavItems.map((item) => {
          const active = isNavActive(pathname, item.match);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[15px] transition-colors",
                active
                  ? "bg-[#F3F1F9] font-bold text-[#6C3FD1]"
                  : "font-medium text-[#6E6B82] hover:bg-[#F3F1F9]/60"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-[#F1EFF7] pt-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "bg-[#F3F1F9] font-bold text-[#6C3FD1]"
              : "font-medium text-[#6E6B82] hover:bg-[#F3F1F9]/60"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
