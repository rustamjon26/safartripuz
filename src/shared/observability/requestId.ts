/** Edge-safe request id (middleware + Node). No node: imports. */
export function createRequestId(existing?: string | null): string {
  if (existing && existing.trim()) return existing.trim().slice(0, 128);
  return globalThis.crypto.randomUUID();
}
