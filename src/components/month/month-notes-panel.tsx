"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { upsertMonthNote } from "@/app/actions/month-notes";
import { Input } from "@/components/ui/input";
import { PrimaryButton, SectionTitle, SurfaceCard } from "@/components/ui/surface";
import { bodyFromBullets, bulletsFromBody } from "@/lib/month/note-bullets";

function withTrailingEmpty(bullets: string[]): string[] {
  if (bullets.length === 0) return [""];
  return bullets[bullets.length - 1] === "" ? bullets : [...bullets, ""];
}

export function MonthNotesPanel({
  month,
  initialBody,
}: {
  month: string;
  initialBody: string;
}) {
  const [bullets, setBullets] = useState(() => withTrailingEmpty(bulletsFromBody(initialBody)));
  const [savedBody, setSavedBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  useEffect(() => {
    setBullets(withTrailingEmpty(bulletsFromBody(initialBody)));
    setSavedBody(initialBody);
  }, [initialBody, month]);

  const savedBullets = bulletsFromBody(savedBody).filter(Boolean);

  function persist(nextBullets: string[], index?: number) {
    const body = bodyFromBullets(nextBullets);
    if (index !== undefined) setSavingIndex(index);

    startTransition(async () => {
      const result = await upsertMonthNote(month, body);
      setSavingIndex(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextBody = result.body ?? "";
      setSavedBody(nextBody);
      setBullets(withTrailingEmpty(bulletsFromBody(nextBody)));
    });
  }

  function updateBullet(index: number, value: string) {
    setBullets((current) => {
      const next = current.map((bullet, i) => (i === index ? value : bullet));
      return withTrailingEmpty(next);
    });
  }

  function isRowDirty(index: number): boolean {
    const value = bullets[index]?.trim() ?? "";
    const saved = savedBullets[index] ?? "";
    // New trailing empty row is never dirty
    if (value === "" && index >= savedBullets.length) return false;
    return value !== saved;
  }

  function handleSaveRow(index: number) {
    const value = bullets[index]?.trim() ?? "";
    if (!value && index >= savedBullets.length) return;
    persist(bullets, index);
  }

  function handleRemove(index: number) {
    const next = bullets.filter((_, i) => i !== index);
    setBullets(withTrailingEmpty(next));
    persist(next, index);
  }

  return (
    <div>
      <SectionTitle className="mb-3">Notes</SectionTitle>
      <SurfaceCard className="px-4 py-3 sm:px-5">
        <ul className="space-y-2">
          {bullets.map((bullet, index) => {
            const dirty = isRowDirty(index);
            const isSaving = isPending && savingIndex === index;
            const showSave = dirty || isSaving;

            return (
              <li key={index} className="flex items-center gap-2">
                <span className="shrink-0 text-sm font-extrabold text-[#9E9AB0]" aria-hidden>
                  •
                </span>
                <Input
                  value={bullet}
                  onChange={(event) => updateBullet(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (dirty) handleSaveRow(index);
                    }
                  }}
                  placeholder="Add a note…"
                  className="border-0 bg-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  aria-label={`Note ${index + 1}`}
                />
                {showSave ? (
                  <PrimaryButton
                    type="button"
                    onClick={() => handleSaveRow(index)}
                    disabled={isPending || !dirty}
                    className="shrink-0 px-3 py-1.5 text-[11px]"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </PrimaryButton>
                ) : null}
                {bullet.trim() || index < savedBullets.length ? (
                  <button
                    type="button"
                    aria-label={`Remove note ${index + 1}`}
                    onClick={() => handleRemove(index)}
                    disabled={isPending}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[#9E9AB0] transition-colors hover:bg-[#FEE2E2] hover:text-[#EF4444] disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : (
                  <span className="size-8 shrink-0" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      </SurfaceCard>
    </div>
  );
}
