/**
 * Normalize a publisher string for independence checks.
 * Lowercase, trim, strip protocol and leading www.
 * Distinct A-tier confirmation uses this key — not raw row count.
 */
export function normalizePublisherKey(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  // Drop path/query if the remainder looks like a host (has a dot, no spaces).
  if (!s.includes(" ") && s.includes(".")) {
    const host = s.split("/")[0] ?? s;
    s = host.split("?")[0] ?? host;
  }
  return s.replace(/\/+$/, "");
}
