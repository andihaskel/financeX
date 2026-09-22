import { cn } from "@/lib/utils";

/** Shared Tailwind classes that follow --fx-* tokens (see globals.css). */
export const fx = {
  ink: "text-fx-ink",
  muted: "text-fx-muted",
  subtle: "text-fx-subtle",
  accent: "text-fx-accent",
  faint: "text-fx-faint",
  canvas: "bg-fx-canvas",
  surface: "bg-fx-surface",
  panel: "bg-fx-panel",
  line: "border-fx-line",
  lineStrong: "border-fx-line-strong",
  hoverSurface: "hover:bg-fx-accent-soft",
  activeNav:
    "bg-fx-accent-soft font-bold text-fx-accent-text dark:bg-transparent dark:hover:bg-fx-accent-soft/80",
  navItem:
    "font-medium text-fx-muted hover:bg-fx-accent-soft/80 dark:bg-transparent",
} as const;

export function surfaceCardClass(className?: string) {
  return cn(
    "rounded-[22px] bg-fx-surface p-6 text-fx-ink shadow-[0_6px_20px_rgba(28,27,41,0.06)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]",
    className
  );
}
