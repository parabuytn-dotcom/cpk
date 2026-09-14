// The school runs on Tunisian wall-clock time, but the server does not:
// Vercel functions run in UTC and a dev machine runs in whatever zone it is
// set to. A `<input type="datetime-local">` value ("2026-09-14T08:00") carries
// no zone, so `new Date(value)` meant "08:00 in the server's zone" — 09:00 in
// Tunis on Vercel, and something else again locally. Everything that turns a
// wall-clock date or a timetable "HH:MM" into an instant goes through here.

export const SCHOOL_TIME_ZONE = "Africa/Tunis";

type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SCHOOL_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function wallClockAt(instant: Date): WallClock & { second: number } {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of the school's zone from UTC at `instant`, in milliseconds. */
function offsetAt(instant: Date) {
  const wall = wallClockAt(instant);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant at which the school's clocks show this date and time. */
export function schoolWallClockToDate({ year, month, day, hour, minute }: WallClock): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset even across a DST change, should Tunisia
  // ever bring DST back (it has none since 2009, so today this is +01:00).
  let instant = guess - offsetAt(new Date(guess));
  instant = guess - offsetAt(new Date(instant));
  return new Date(instant);
}

/**
 * Parses a form date. A value with an explicit zone ("Z", "+01:00") is taken
 * as is; a bare "YYYY-MM-DDTHH:MM" is read as Tunisian time. Returns an
 * Invalid Date for anything unparseable, like `new Date()` does.
 */
export function parseSchoolDateTime(value: string): Date {
  const trimmed = value.trim();
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) return new Date(trimmed);

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return new Date(Number.NaN);
  const [, year, month, day, hour = "0", minute = "0"] = match;
  return schoolWallClockToDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  });
}

/** Calendar date (in Tunis) of `instant`, as a UTC-midnight Date usable for day arithmetic. */
export function schoolCalendarDay(instant: Date): Date {
  const wall = wallClockAt(instant);
  return new Date(Date.UTC(wall.year, wall.month - 1, wall.day));
}

/** 1 = Monday … 7 = Sunday, for a calendar day from schoolCalendarDay(). */
export function isoWeekdayOf(calendarDay: Date) {
  const day = calendarDay.getUTCDay();
  return day === 0 ? 7 : day;
}

/** The instant a timetable slot "HH:MM" starts on a calendar day from schoolCalendarDay(). */
export function slotInstant(calendarDay: Date, hhmm: string): Date {
  const [hour, minute] = hhmm.split(":").map(Number);
  return schoolWallClockToDate({
    year: calendarDay.getUTCFullYear(),
    month: calendarDay.getUTCMonth() + 1,
    day: calendarDay.getUTCDate(),
    hour,
    minute,
  });
}

export function formatSchoolDateTime(
  instant: Date | string,
  locale = "fr-FR",
  options: Intl.DateTimeFormatOptions = { dateStyle: "short", timeStyle: "short" },
) {
  return new Date(instant).toLocaleString(locale, { ...options, timeZone: SCHOOL_TIME_ZONE });
}
