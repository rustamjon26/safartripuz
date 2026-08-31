/**
 * Staff PWA fetch: cookies + one 401 → refresh → retry (access JWT is 15m).
 */
export async function staffFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = {
    ...init,
    credentials: "include",
  };

  const first = await fetch(input, opts);
  if (first.status !== 401) return first;

  const refresh = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  });
  if (!refresh.ok) return first;

  return fetch(input, opts);
}
