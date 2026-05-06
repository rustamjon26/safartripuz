import { router } from "expo-router";
import { API_BASE_URL, NETWORK_ERROR_MESSAGE } from "./constants";
import { getApiUrl, getToken, removeToken, removeUser } from "./storage";

/** Per-request timeout. Physical devices pointed at a dead LAN IP
 * would otherwise hang for ~60s; 8s feels snappy and still tolerates
 * slow mobile hotspots. */
export const REQUEST_TIMEOUT_MS = 8000;

/**
 * Returns the effective API base URL: the dev-override saved in
 * SecureStore if present, otherwise the .env-baked `API_BASE_URL`.
 */
export async function getEffectiveApiBaseUrl(): Promise<string> {
  try {
    const override = await getApiUrl();
    if (override && override.trim().length > 0) {
      return override.trim().replace(/\/+$/, "");
    }
  } catch {
    // SecureStore may fail on web; ignore and use default.
  }
  return API_BASE_URL;
}

/** Alias matching the spec. */
export const getBaseUrl = getEffectiveApiBaseUrl;

/** Thrown after 401 cleanup + redirect; callers should not surface as UI error */
export class AuthRedirectError extends Error {
  constructor() {
    super("AUTH_REDIRECT");
    this.name = "AuthRedirectError";
  }
}

type ApiOptions = RequestInit & {
  body?: unknown;
};

function isLikelyNetworkFailure(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    return m.includes("network request failed") || m.includes("failed to fetch") || m.includes("network error");
  }
  return false;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = await getEffectiveApiBaseUrl();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      body:
        options.body !== undefined && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | null | undefined),
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && (e.name === "AbortError" || e.message.toLowerCase().includes("abort"))) {
      throw new Error("TIMEOUT");
    }
    if (isLikelyNetworkFailure(e)) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }
    throw e instanceof Error ? e : new Error(NETWORK_ERROR_MESSAGE);
  }
  clearTimeout(timeoutId);

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    await removeToken();
    await removeUser();
    router.replace("/(auth)/login");
    throw new AuthRedirectError();
  }

  if (data?.success === false && typeof data?.error === "string") {
    throw new Error(data.error);
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

export const api = {
  get: (path: string) => apiFetch(path, { method: "GET" }),
  post: (path: string, body?: unknown) =>
    apiFetch(path, { method: "POST", body: body as ApiOptions["body"] }),
  put: (path: string, body?: unknown) =>
    apiFetch(path, { method: "PUT", body: body as ApiOptions["body"] }),
  patch: (path: string, body?: unknown) =>
    apiFetch(path, { method: "PATCH", body: body as ApiOptions["body"] }),
  delete: (path: string) => apiFetch(path, { method: "DELETE" }),
};
