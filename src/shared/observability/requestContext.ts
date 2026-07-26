import { AsyncLocalStorage } from "node:async_hooks";
import { createRequestId } from "./requestId";

type Store = { requestId: string };

const als = new AsyncLocalStorage<Store>();

export { createRequestId };

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
