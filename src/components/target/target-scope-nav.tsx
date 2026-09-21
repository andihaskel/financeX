"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/target", label: "Overview", match: (path: string) => path === "/target" },
  {
    href: "/target/month",
    label: "Monthly",
    match: (path: string) => path.startsWith("/target/month"),
  },
  {
    href: "/target/annual",
    label: "Annual",
    match: (path: string) => path.startsWith("/target/annual"),
  },
] as const;

export function TargetScopeNav() {
  const pathname = usePathname();

  return (
    <div className="flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-[#EDEAF7] p-1">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
              active
                ? "bg-white text-[#1C1B29] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
                : "text-[#6E6B82] hover:text-[#1C1B29]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
