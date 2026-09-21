import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Marks numeric text blurred when html[data-incognito] is set (see globals.css). */
export function BlurNumbers({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("fx-sensitive inline-block tabular-nums", className)}>{children}</span>;
}
