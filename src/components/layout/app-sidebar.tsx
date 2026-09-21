"use client";

import Link from "next/link";

import {
  AppNavMenu,
  AppNavSettingsLink,
} from "@/components/layout/app-nav-menu";

export function AppSidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col bg-white px-5 py-7 shadow-[1px_0_0_rgba(28,27,41,0.06)] md:flex">
      <Link href="/apps" className="mb-8 flex items-center gap-2.5 px-2 hover:opacity-80">
        <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
        <span className="text-lg font-extrabold text-[#1C1B29]">financeX</span>
      </Link>

      <AppNavMenu />

      <div className="flex-1" />

      <div className="border-t border-[#F1EFF7] pt-4">
        <AppNavSettingsLink />
      </div>
    </aside>
  );
}
