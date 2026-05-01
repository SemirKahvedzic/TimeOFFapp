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

function tzParts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"), month: get("month"), day: get("day"),
    hour: get("hour") % 24, minute: get("minute"), second: get("second"),
  };
}

/**
 * Convert a wall-clock string like "2025-05-15T14:30" — entered by a user
 * who's reading the form in `timeZone` — into the corresponding UTC Date.
 * Handles DST correctly for the date in question.
 */
export function tzWallClockToUtc(wallClock: string, timeZone: string): Date {
  const naive = new Date(wallClock + (wallClock.length === 16 ? ":00" : "") + "Z");
  const p = tzParts(naive, timeZone);
  const tzAsUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offsetMs = tzAsUtcMs - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}

/**
 * Inverse of tzWallClockToUtc — render a UTC Date as a "yyyy-MM-ddTHH:mm"
 * string suitable for prefilling <input type="datetime-local">.
 */
export function utcToTzWallClock(date: Date, timeZone: string): string {
  const p = tzParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Format a UTC Date in a specific company time zone for display. */
export function formatInCompanyTz(
  date: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(date));
}
