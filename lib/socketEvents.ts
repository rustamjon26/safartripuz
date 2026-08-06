/**
 * The Socket.IO contract, in one place, so an event name typo cannot quietly
 * become a channel nobody listens on and a browser cannot push arbitrary event
 * names into the server's listener table.
 */

/** What a connected client is allowed to emit. Anything else is dropped. */
export const CLIENT_EVENTS = [
  "join:order",
  "join:driver",
  "driver:location",
] as const;

/** What the server is allowed to broadcast. */
export const SERVER_EVENTS = [
  "driver:location",
  "order:new",
  "order:status",
  "order:accepted",
  "order:arrived",
  "order:started",
  "order:completed",
  "order:cancelled",
] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];
export type ServerEvent = (typeof SERVER_EVENTS)[number];

export function isClientEvent(name: string): name is ClientEvent {
  return (CLIENT_EVENTS as readonly string[]).includes(name);
}

export function isServerEvent(name: string): name is ServerEvent {
  return (SERVER_EVENTS as readonly string[]).includes(name);
}

/**
 * Origins allowed to open a Socket.IO connection.
 *
 * Native clients (the Expo driver and customer apps) send no Origin header at
 * all, which the connection handler treats separately — this list only governs
 * browsers. Override with SOCKET_ALLOWED_ORIGINS (comma separated).
 */
export function resolveAllowedOrigins(
  source: Record<string, string | undefined> = process.env,
): string[] {
  const explicit = (source.SOCKET_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const inherited = [
    source.NEXT_PUBLIC_APP_URL,
    source.APP_URL,
    source.NEXT_PUBLIC_SITE_URL,
  ].filter((v): v is string => Boolean(v && v.trim()));

  const dev =
    source.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : [];

  const all = [...explicit, ...inherited, ...dev].map(normalizeOrigin);
  // Never resolve to an empty list: that would reject every browser, silently
  // killing live order tracking. The canonical host is the same default the
  // rest of the app falls back to (app/layout.tsx, robots.ts, sitemap.ts).
  if (all.length === 0) all.push(DEFAULT_ORIGIN);
  return [...new Set(all)];
}

export const DEFAULT_ORIGIN = "https://safartrip.uz";

export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function isOriginAllowed(
  origin: string | undefined,
  allowed: readonly string[],
): boolean {
  // No Origin header: a native app or a server-to-server client, not a browser
  // page that the same-origin policy would otherwise protect.
  if (!origin) return true;
  return allowed.includes(normalizeOrigin(origin));
}
