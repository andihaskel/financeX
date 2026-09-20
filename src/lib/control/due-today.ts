const DEFAULT_TIMEZONE = "America/Montevideo";

export const DUE_REMINDER_WINDOW_DAYS = 3;

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

export function effectiveDueDay(
  dueDay: number,
  year: number,
  month: number
): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(dueDay, lastDay);
}

/** Days until due date in that occurrence month. Negative = overdue. */
export function daysUntilDueInMonth(
  dueDay: number | null | undefined,
  occurrenceYear: number,
  occurrenceMonth: number,
  todayYear: number,
  todayMonth: number,
  todayDay: number
): number | null {
  if (dueDay == null || dueDay < 1) return null;
  const day = effectiveDueDay(dueDay, occurrenceYear, occurrenceMonth);
  const dueMs = Date.UTC(occurrenceYear, occurrenceMonth - 1, day);
  const todayMs = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.round((dueMs - todayMs) / 86400000);
}

/** True when due today or within the next `windowDays` days (inclusive). */
export function isDueWithinDays(
  dueDay: number | null | undefined,
  occurrenceYear: number,
  occurrenceMonth: number,
  todayYear: number,
  todayMonth: number,
  todayDay: number,
  windowDays: number = DUE_REMINDER_WINDOW_DAYS
): boolean {
  const days = daysUntilDueInMonth(
    dueDay,
    occurrenceYear,
    occurrenceMonth,
    todayYear,
    todayMonth,
    todayDay
  );
  return days != null && days >= 0 && days <= windowDays;
}

/** @deprecated Prefer isDueWithinDays for reminders. */
export function isDueOnCalendarDay(
  dueDay: number | null | undefined,
  year: number,
  month: number,
  day: number
): boolean {
  return isDueWithinDays(dueDay, year, month, year, month, day, 0);
}

export function formatDaysUntilDueLabel(
  daysUntil: number,
  occurrenceYear: number,
  occurrenceMonth: number,
  dueDay: number
): string {
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  if (daysUntil > 1) return `Due in ${daysUntil}d`;

  const day = effectiveDueDay(dueDay, occurrenceYear, occurrenceMonth);
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(occurrenceYear, occurrenceMonth - 1, day)));
  return label;
}

export function monthsToScanForDueWindow(
  year: number,
  month: number,
  day: number,
  windowDays: number = DUE_REMINDER_WINDOW_DAYS
): { year: number; month: number }[] {
  const months = [{ year, month }];
  const lastDay = new Date(year, month, 0).getDate();
  if (day + windowDays > lastDay) {
    if (month === 12) months.push({ year: year + 1, month: 1 });
    else months.push({ year, month: month + 1 });
  }
  return months;
}
