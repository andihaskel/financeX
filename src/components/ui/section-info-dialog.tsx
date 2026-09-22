"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SECTION_INFO,
  type SectionInfoKey,
} from "@/lib/help/section-info";
import { fx } from "@/lib/design/fx-classes";
import { cn } from "@/lib/utils";

export function SectionInfoButton({
  infoKey,
  variant = "default",
  className,
}: {
  infoKey: SectionInfoKey;
  variant?: "default" | "onDark" | "subtle";
  className?: string;
}) {
  const info = SECTION_INFO[infoKey];
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full transition-colors",
          variant === "default" &&
            cn("size-8", fx.subtle, "hover:bg-fx-accent-soft hover:text-fx-accent-text"),
          variant === "onDark" &&
            "size-7 text-white/70 hover:bg-white/15 hover:text-white",
          variant === "subtle" &&
            cn("size-7", fx.faint, "hover:text-fx-accent-text"),
          className
        )}
        aria-label={`About ${info.title}`}
      >
        <Info className="size-4" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[26px] border-fx-line bg-fx-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={cn("text-[20px] font-extrabold", fx.ink)}>
              {info.title}
            </DialogTitle>
          </DialogHeader>
          <div className={cn("space-y-4 text-sm font-semibold leading-relaxed", fx.muted)}>
            {info.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {info.sections?.map((section) => (
              <div key={section.title}>
                <h3 className={cn("text-[13px] font-extrabold uppercase tracking-wide", fx.ink)}>
                  {section.title}
                </h3>
                <div className="mt-2 space-y-2">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PageTitleWithInfo({
  title,
  infoKey,
  className,
}: {
  title: string;
  infoKey: SectionInfoKey;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <h1 className={cn("text-[26px] font-extrabold", fx.ink)}>{title}</h1>
      <SectionInfoButton infoKey={infoKey} />
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-4 text-lg font-extrabold tracking-tight",
        fx.ink,
        className
      )}
    >
      {children}
    </h2>
  );
}

export function SubsectionLabel({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "hero" | "card";
}) {
  return (
    <p
      className={cn(
        "mb-3 text-[12px] font-bold uppercase tracking-wide",
        tone === "hero" && "text-white opacity-75",
        tone === "muted" && fx.subtle,
        tone === "card" && fx.subtle,
        className
      )}
    >
      {children}
    </p>
  );
}
