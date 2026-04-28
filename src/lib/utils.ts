import { format, differenceInCalendarDays, isSameDay, eachDayOfInterval } from "date-fns";

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateShort(date: string | Date) {
  return format(new Date(date), "MMM d");
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const s = new Date(start);
  const e = new Date(end);
  if (isSameDay(s, e)) return format(s, "MMM d, yyyy");
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
    return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
  }
  return `${format(s, "MMM d, yyyy")} – ${format(e, "MMM d, yyyy")}`;
}

export function daysBetween(start: string | Date, end: string | Date) {
  return differenceInCalendarDays(new Date(end), new Date(start)) + 1;
}

/**
 * Count actual leave days for a request range:
 *  - exclude weekends not in workWeek
 *  - exclude holiday dates (matched by yyyy-MM-dd)
 *  - subtract 0.5 each for halfDayStart and halfDayEnd
 */
export function countLeaveDays(opts: {
  start: Date | string;
  end: Date | string;
  workWeek?: number[]; // weekday numbers 0..6
  holidays?: { date: Date | string }[];
  halfDayStart?: boolean;
  halfDayEnd?: boolean;
}): number {
  const start = new Date(opts.start);
  const end = new Date(opts.end);
  const workWeek = opts.workWeek ?? [1, 2, 3, 4, 5];
  const holidayKeys = new Set(
    (opts.holidays ?? []).map((h) =>
      format(new Date(h.date), "yyyy-MM-dd")
    )
  );
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const d of days) {
    if (!workWeek.includes(d.getDay())) continue;
    if (holidayKeys.has(format(d, "yyyy-MM-dd"))) continue;
    count += 1;
  }
  if (count === 0) return 0;
  if (opts.halfDayStart) count -= 0.5;
  if (opts.halfDayEnd && !isSameDay(start, end)) count -= 0.5;
  // single day with both half-day markers means a single half-day
  if (opts.halfDayStart && opts.halfDayEnd && isSameDay(start, end)) {
    count = 0.5;
  }
  return Math.max(0, count);
}

export function formatLeaveDays(n: number): string {
  if (n === 0) return "0 days";
  if (n === 0.5) return "½ day";
  if (Number.isInteger(n)) return `${n} ${n === 1 ? "day" : "days"}`;
  return `${n} days`;
}
