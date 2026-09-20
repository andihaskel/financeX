const DEFAULT_TIMEZONE = "America/Montevideo";

export function getZonedYmd(
  timeZone: string = DEFAULT_TIMEZONE,
  date: Date = new Date()
): { year: number; month: number; day: number; dateLabel: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return {
    year,
    month,
    day,
    dateLabel: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** True when the commitment's due_day falls on this calendar day (clamped to month length). */
export function isDueOnCalendarDay(
  dueDay: number | null | undefined,
  year: number,
  month: number,
  day: number
): boolean {
  if (dueDay == null || dueDay < 1) return false;
  const lastDay = new Date(year, month, 0).getDate();
  const effectiveDueDay = Math.min(dueDay, lastDay);
  return effectiveDueDay === day;
}
