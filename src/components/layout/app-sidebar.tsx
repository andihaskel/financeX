"use client";

import Link from "next/link";

import { AppNavFooter } from "@/components/layout/app-nav-footer";
import { AppNavMenu } from "@/components/layout/app-nav-menu";

export function AppSidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-fx-line bg-fx-surface px-5 py-7 md:flex">
      <Link href="/apps" className="mb-8 flex items-center gap-2.5 px-2 hover:opacity-80">
        <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
        <span className="text-lg font-extrabold text-fx-ink">financeX</span>
      </Link>

      <AppNavMenu />

      <div className="flex-1" />

      <AppNavFooter />
    </aside>
  );
}
