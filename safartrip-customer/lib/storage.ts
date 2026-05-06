import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "safartrip_customer_token";
const USER_KEY = "safartrip_customer_user";
const API_URL_KEY = "api_url";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: object): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<object | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as object;
  } catch {
    return null;
  }
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Dev-only override of the API base URL. When set, `lib/api.ts` uses
 * this instead of the value baked from `.env`, so testers can point the
 * app at a LAN IP from a physical device without rebuilding.
 */
export async function saveApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(API_URL_KEY, url);
}

export async function getApiUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(API_URL_KEY);
}

export async function clearApiUrl(): Promise<void> {
  await SecureStore.deleteItemAsync(API_URL_KEY);
}
