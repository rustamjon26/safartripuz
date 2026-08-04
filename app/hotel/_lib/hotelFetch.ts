/**
 * Hotel panel fetch: cookies + one 401 → refresh → retry.
 * Access JWT is 15m; without this, long-open tabs fail with Unauthorized.
 */
export async function hotelFetch(
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

export function hotelApiErrorMessage(
  status: number,
  error?: string,
): string {
  if (
    status === 401 ||
    error === "Unauthorized" ||
    error === "Seans muddati tugagan. Qayta kiring."
  ) {
    return "Seans muddati tugagan. Qayta kiring.";
  }
  if (
    status === 403 ||
    error === "Forbidden" ||
    error === "Bu amal uchun ruxsat yo'q."
  ) {
    return "Bu amal uchun ruxsat yo'q.";
  }
  return error?.trim() || "Xatolik yuz berdi";
}
