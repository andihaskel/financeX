"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function TargetScopeNav() {
  const pathname = usePathname();
  const isAnnual = pathname.startsWith("/target/annual");

  return (
    <div className="flex w-fit gap-0.5 rounded-full bg-[#EDEAF7] p-1">
      <Link
        href="/target"
        className={cn(
          "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
          !isAnnual
            ? "bg-white text-[#1C1B29] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
            : "text-[#6E6B82] hover:text-[#1C1B29]"
        )}
      >
        Monthly
      </Link>
      <Link
        href="/target/annual"
        className={cn(
          "rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
          isAnnual
            ? "bg-white text-[#1C1B29] shadow-[0_2px_8px_rgba(28,27,41,0.06)]"
            : "text-[#6E6B82] hover:text-[#1C1B29]"
        )}
      >
        Annual
      </Link>
    </div>
  );
}
