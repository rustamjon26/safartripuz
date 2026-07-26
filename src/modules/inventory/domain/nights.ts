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

export function formatDateOnly(d: Date): string {
  return utcDateOnly(d).toISOString().slice(0, 10);
}
