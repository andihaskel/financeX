import { format, parseISO } from "date-fns";

/** Unique yyyy-MM keys covered by a set of ISO dates (yyyy-MM-dd). */
export function monthsCoveredByDates(dates: string[]): string[] {
  const months = new Set<string>();
  for (const date of dates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      months.add(date.slice(0, 7));
    }
  }
  return [...months].sort();
}

export function formatStatementDateRange(start: string, end: string): string {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} – ${end}`;
  }
  if (start === end) {
    return format(startDate, "MMM d, yyyy");
  }
  if (startDate.getFullYear() === endDate.getFullYear()) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${format(startDate, "MMM d")} – ${format(endDate, "d, yyyy")}`;
    }
    return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  }
  return `${format(startDate, "MMM d, yyyy")} – ${format(endDate, "MMM d, yyyy")}`;
}

export function formatMonthsCoveredLabel(months: string[]): string {
  if (months.length === 0) return "";
  if (months.length === 1) {
    return format(parseISO(`${months[0]}-01`), "MMMM yyyy");
  }
  const first = format(parseISO(`${months[0]}-01`), "MMM yyyy");
  const last = format(parseISO(`${months[months.length - 1]}-01`), "MMM yyyy");
  return `${first} – ${last}`;
}
