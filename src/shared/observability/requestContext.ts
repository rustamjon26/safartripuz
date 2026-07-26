import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type Store = { requestId: string };

const als = new AsyncLocalStorage<Store>();

export function createRequestId(existing?: string | null): string {
  if (existing && existing.trim()) return existing.trim().slice(0, 128);
  return randomUUID();
}

export function withRequestId<T>(requestId: string, fn: () => T): T {
  return als.run({ requestId }, fn);
}

export async function withRequestIdAsync<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return als.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}
