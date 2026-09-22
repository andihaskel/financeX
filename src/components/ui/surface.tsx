import { surfaceCardClass } from "@/lib/design/fx-classes";
import { cn } from "@/lib/utils";

export { PageTitleWithInfo, SectionInfoButton, SectionTitle, SubsectionLabel } from "@/components/ui/section-info-dialog";

export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={surfaceCardClass(className)}>{children}</div>
  );
}

export function GradientHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] bg-gradient-to-br from-[#9B6FF0] to-[#5F3DC4] p-5 text-white sm:p-7",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-[14px] bg-gradient-to-br from-[#9B6FF0] to-[#6C3FD1] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(108,63,209,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CategoryChip({
  emoji,
  color,
  size = "md",
}: {
  emoji: string;
  color: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[13px] text-[17px]",
        size === "sm" ? "h-9 w-9 text-base" : "h-[38px] w-[38px]"
      )}
      style={{ backgroundColor: color }}
    >
      {emoji}
    </div>
  );
}
