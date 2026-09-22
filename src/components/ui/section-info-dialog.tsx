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
            "size-8 text-[#9E9AB0] hover:bg-[#F3F1F9] hover:text-[#6C3FD1]",
          variant === "onDark" &&
            "size-7 text-white/70 hover:bg-white/15 hover:text-white",
          variant === "subtle" &&
            "size-7 text-[#C7C3D6] hover:text-[#6C3FD1]",
          className
        )}
        aria-label={`About ${info.title}`}
      >
        <Info className="size-4" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[26px] border-[#F1EFF7] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold text-[#1C1B29]">
              {info.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm font-semibold leading-relaxed text-[#6E6B82]">
            {info.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
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
      <h1 className="text-[26px] font-extrabold text-[#1C1B29]">{title}</h1>
      <SectionInfoButton infoKey={infoKey} />
    </div>
  );
}

export function SectionTitle({
  children,
  infoKey,
  className,
}: {
  children: React.ReactNode;
  infoKey?: SectionInfoKey;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start gap-1", className)}>
      <h2 className="min-w-0 flex-1 text-lg font-extrabold tracking-tight text-[#1C1B29]">
        {children}
      </h2>
      {infoKey ? <SectionInfoButton infoKey={infoKey} /> : null}
    </div>
  );
}

export function SubsectionLabel({
  children,
  infoKey,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  infoKey?: SectionInfoKey;
  className?: string;
  tone?: "muted" | "hero" | "card";
}) {
  return (
    <div className={cn("mb-3 flex items-start gap-1", className)}>
      <p
        className={cn(
          "min-w-0 flex-1 text-[12px] font-bold uppercase tracking-wide",
          tone === "hero" && "text-white opacity-75",
          tone === "muted" && "text-[#9E9AB0]",
          tone === "card" && "text-[#9E9AB0]"
        )}
      >
        {children}
      </p>
      {infoKey ? (
        <SectionInfoButton
          infoKey={infoKey}
          variant={tone === "hero" ? "onDark" : "subtle"}
        />
      ) : null}
    </div>
  );
}
