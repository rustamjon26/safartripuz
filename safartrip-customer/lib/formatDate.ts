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
  return `${d.getDate()} ${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()}`;
}

/** Masalan: 15 Aprel 2026, 14:30 */
export function formatDateTime(input: Date | string | number): string {
  const d = toDate(input);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${h}:${m}`;
}

/** Masalan: 150 000 so'm */
export function formatPrice(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  const s = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${s} so'm`;
}

/** Masalan: 3 kecha */
export function formatNights(n: number): string {
  return `${n} kecha`;
}

/** Masalan: 2 soat */
export function formatHours(n: number): string {
  return `${n} soat`;
}
