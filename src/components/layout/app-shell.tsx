"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const mobileLinks = [
  { href: "/home", label: "Home" },
  { href: "/movements", label: "Movements" },
  { href: "/control", label: "Control" },
  { href: "/target", label: "Targets" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#F3F1F9] text-[#1C1B29]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[#F1EFF7] bg-white px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1]" />
            <span className="font-extrabold">financeX</span>
          </div>
          <Sheet>
            <SheetTrigger className={cn(buttonVariants({ variant: "outline", size: "icon" }))}>
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {mobileLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-[14px] px-3 py-2.5 text-sm font-semibold",
                      pathname.startsWith(link.href)
                        ? "bg-[#F3F1F9] text-[#6C3FD1]"
                        : "text-[#6E6B82]"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <main className="relative flex-1 px-4 py-8 md:px-14 md:py-11">
          <div className="mx-auto max-w-[920px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
