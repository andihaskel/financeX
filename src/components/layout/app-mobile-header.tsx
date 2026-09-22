"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";

import { AppNavFooter } from "@/components/layout/app-nav-footer";
import { AppNavMenu } from "@/components/layout/app-nav-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppMobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-fx-line bg-fx-surface md:hidden">
      <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] text-fx-ink transition-colors hover:bg-fx-accent-soft"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <SheetContent
            side="left"
            showCloseButton
            className="w-[min(100vw-2rem,280px)] gap-0 border-fx-line bg-fx-surface p-0 sm:max-w-[280px]"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col px-5 py-7">
              <Link
                href="/apps"
                onClick={() => setOpen(false)}
                className="mb-8 flex items-center gap-2.5 px-2 hover:opacity-80"
              >
                <div className="h-[26px] w-[26px] rounded-[9px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
                <span className="text-lg font-extrabold text-fx-ink">financeX</span>
              </Link>

              <AppNavMenu onNavigate={() => setOpen(false)} />

              <div className="flex-1" />

              <div className="space-y-1">
                <AppNavFooter onNavigate={() => setOpen(false)} />
                <Link
                  href="/apps"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-[15px] font-medium text-fx-muted transition-colors hover:bg-fx-accent-soft/80"
                >
                  Your space
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link
          href="/home"
          className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80"
        >
          <div className="h-[22px] w-[22px] shrink-0 rounded-[8px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
          <span className="truncate text-base font-extrabold text-fx-ink">financeX</span>
        </Link>
      </div>
    </header>
  );
}
