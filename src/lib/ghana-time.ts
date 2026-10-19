/**
 * Ghana Time (GMT/UTC+0) utilities.
 * Ghana does NOT observe DST; it is always UTC+0 (Africa/Accra).
 * All date/time formatting in this app should use these helpers to ensure
 * times shown to users are correct Ghana local time.
 */

export const GHANA_TZ = "Africa/Accra";

/**
 * Returns a Date representing midnight UTC today (== midnight Ghana time,
 * since Africa/Accra is always UTC+0).
 */
export function todayMidnightGhana(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Format a Date or ISO string as a time string in Ghana timezone.
 * Default: "10:30 PM"
 */
export function formatTimeGhana(
  dateOrIso: Date | string,
  opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true }
): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  return d.toLocaleTimeString("en-US", { ...opts, timeZone: GHANA_TZ });
}

/**
 * Format a Date as HH:MM:SS in Ghana timezone, for the "last updated" clock.
 */
export function formatClockGhana(dateOrIso: Date | string): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: GHANA_TZ,
  });
}

/**
 * Classify a match kickoff ISO string as Today / Tomorrow / Upcoming
 * relative to Ghana's current date.
 */
export function dayBucketGhana(iso: string): "Today" | "Tomorrow" | "Upcoming" {
  const matchDate = new Date(iso);
  const midnight = todayMidnightGhana();
  const DAY = 86400000;
  const diff = Math.floor((matchDate.getTime() - midnight.getTime()) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return "Upcoming";
}

/**
 * Return the current date in ESPN `dates=` parameter format: YYYYMMDD
 * in Ghana timezone, with optional day offset.
 */
export function espnDateParam(offsetDays = 0): string {
  const midnight = todayMidnightGhana();
  const d = new Date(midnight.getTime() + offsetDays * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Return ISO date (YYYY-MM-DD) for a day offset from Ghana today.
 */
export function isoDateGhana(offsetDays = 0): string {
  const midnight = todayMidnightGhana();
  const d = new Date(midnight.getTime() + offsetDays * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface GhanaDateOption {
  id: string;
  label: string;
  shortLabel: string;
  dayName: string;
  dateFormatted: string;
  isoDate: string;
  iso: string;
  espnParam: string;
}

/**
 * Generate the 7-day date-tab options, with all labels in Ghana time.
 */
export function generateGhanaDateOptions(): GhanaDateOption[] {
  const options: GhanaDateOption[] = [];
  const midnight = todayMidnightGhana();

  for (let i = 0; i < 7; i++) {
    const d = new Date(midnight.getTime() + i * 86400000);
    const weekdayLong = d.toLocaleDateString("en-US", { weekday: "long", timeZone: GHANA_TZ });
    const weekdayShort = d.toLocaleDateString("en-US", { weekday: "short", timeZone: GHANA_TZ });
    const moPadded = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dayPadded = String(d.getUTCDate()).padStart(2, "0");
    const y = d.getUTCFullYear();

    const dayName = i === 0 ? "TODAY" : i === 1 ? "TOMORROW" : weekdayLong.toUpperCase();
    const dateFormatted = `${weekdayLong}, ${moPadded}/${dayPadded}`;
    const shortLabel = `${dayPadded}/${moPadded} ${weekdayShort}`;
    const isoDate = `${y}-${moPadded}-${dayPadded}`;
    const espnParam = `${y}${moPadded}${dayPadded}`;

    options.push({ id: isoDate, label: dateFormatted, shortLabel, dayName, dateFormatted, isoDate, iso: isoDate, espnParam });
  }

  return options;
}
