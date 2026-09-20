"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Home, LineChart, Settings, Wallet } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/home", label: "Home", icon: Home, match: ["/home", "/month"] },
  { href: "/movements", label: "Movements", icon: Wallet, match: ["/movements", "/transactions"] },
  { href: "/control", label: "Control", icon: ClipboardCheck, match: ["/control"] },
  { href: "/target", label: "Targets", icon: LineChart, match: ["/target", "/plan", "/budget"] },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(match: string[]) {
    return match.some((m) => pathname.startsWith(m));
  }

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col bg-white px-5 py-7 shadow-[1px_0_0_rgba(28,27,41,0.06)] md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
        <span className="text-lg font-extrabold text-[#1C1B29]">financeX</span>
      </div>

      <nav className="flex flex-col gap-1">
        {mainNav.map((item) => {
          const active = isActive(item.match);
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
        <form action={signOut} className="mt-2 px-2">
          <button
            type="submit"
            className="text-sm font-medium text-[#9E9AB0] hover:text-[#6E6B82]"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
