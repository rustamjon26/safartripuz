/** Build half-open night dates [checkIn, checkOut) as UTC date-only Dates. */
export function enumerateNights(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  const start = utcDateOnly(checkIn);
  const end = utcDateOnly(checkOut);
  if (end.getTime() <= start.getTime()) {
    throw new Error("checkOut must be after checkIn");
  }
  for (let d = new Date(start); d.getTime() < end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(new Date(d));
  }
  return nights;
}

export function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Parse a `YYYY-MM-DD` calendar date into UTC midnight.
 *
 * Inventory keys every night on a UTC date-only value, so a calendar date has
 * to be read the same way. `new Date(y, m - 1, d)` reads it in the server's
 * zone instead: on a UTC+5 host that is 19:00 the previous day, and
 * `utcDateOnly` then files the night under the wrong date entirely.
 */
export function parseDateOnlyUtc(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function formatDateOnly(d: Date): string {
  return utcDateOnly(d).toISOString().slice(0, 10);
}
