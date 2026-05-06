const MONTHS_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
] as const;

function toDate(input: Date | string | number): Date {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Masalan: 15 Aprel 2026 */
export function formatDate(input: Date | string | number): string {
  const d = toDate(input);
  const day = d.getDate();
  const month = MONTHS_UZ[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Masalan: 15 Aprel 2026, 14:30 */
export function formatDateTime(input: Date | string | number): string {
  const d = toDate(input);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${h}:${m}`;
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Qisqa nisbiy vaqt: "2 soat oldin", "Kecha", "3 kun oldin" */
export function formatRelative(input: Date | string | number): string {
  const d = toDate(input);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "hozirgina";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;

  const today0 = startOfLocalDay(now);
  const y0 = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const d0 = startOfLocalDay(d);

  if (d0.getTime() === y0.getTime()) return "Kecha";

  const dayDiff = Math.floor((today0.getTime() - d0.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDiff >= 1 && dayDiff < 7) return `${dayDiff} kun oldin`;
  if (dayDiff >= 7 && dayDiff < 30) return `${Math.floor(dayDiff / 7)} hafta oldin`;
  if (dayDiff >= 30 && dayDiff < 365) return `${Math.floor(dayDiff / 30)} oy oldin`;
  return formatDate(d);
}
