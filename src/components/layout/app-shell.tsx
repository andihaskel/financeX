"use client";

import { AppMobileHeader } from "@/components/layout/app-mobile-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-fx-canvas text-fx-ink">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileHeader />
        <main className="relative flex-1 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 md:px-14 md:pb-20 md:pt-11">
          <div className="mx-auto max-w-[920px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
