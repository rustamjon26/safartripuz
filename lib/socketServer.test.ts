/**
 * Socket.IO origin allow-list and client event contract, driven over the raw
 * Engine.IO polling protocol so no socket.io-client dependency is needed.
 */
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachSocketServer } from "./socketServer";
import {
  isOriginAllowed,
  normalizeOrigin,
  resolveAllowedOrigins,
} from "./socketEvents";

const ALLOWED = "https://safartrip.uz";
const silent = { log: () => {}, warn: () => {} } as unknown as Pick<
  Console,
  "log" | "warn"
>;

describe("resolveAllowedOrigins", () => {
  it("takes SOCKET_ALLOWED_ORIGINS plus the configured app URLs", () => {
    expect(
      resolveAllowedOrigins({
        NODE_ENV: "production",
        SOCKET_ALLOWED_ORIGINS: "https://a.uz, https://b.uz/",
        NEXT_PUBLIC_APP_URL: "https://safartrip.uz",
      }),
    ).toEqual(["https://a.uz", "https://b.uz", "https://safartrip.uz"]);
  });

  it("never resolves to an empty list, which would reject every browser", () => {
    expect(resolveAllowedOrigins({ NODE_ENV: "production" })).toEqual([
      "https://safartrip.uz",
    ]);
  });

  it("adds localhost only outside production", () => {
    expect(resolveAllowedOrigins({ NODE_ENV: "development" })).toContain(
      "http://localhost:3000",
    );
    expect(
      resolveAllowedOrigins({
        NODE_ENV: "production",
        APP_URL: "https://safartrip.uz",
      }),
    ).not.toContain("http://localhost:3000");
  });

  it("treats a missing Origin header as a native client, not a browser", () => {
    expect(isOriginAllowed(undefined, [ALLOWED])).toBe(true);
    expect(isOriginAllowed("https://evil.example", [ALLOWED])).toBe(false);
    expect(isOriginAllowed("https://SafarTrip.uz/", [ALLOWED])).toBe(true);
    expect(normalizeOrigin("https://SafarTrip.uz//")).toBe("https://safartrip.uz");
  });
});

describe("socket server", () => {
  let httpServer: HttpServer;
  let base = "";
  let close: () => void = () => {};

  beforeAll(async () => {
    httpServer = createServer((_req, res) => res.end("ok"));
    const io = attachSocketServer(httpServer, {
      allowedOrigins: [ALLOWED],
      log: silent,
    });
    close = () => {
      io.close();
      httpServer.close();
    };
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address() as AddressInfo;
    base = `http://127.0.0.1:${port}/socket.io/?EIO=4&transport=polling`;
  });

  afterAll(() => close());

  async function handshake(): Promise<string> {
    const res = await fetch(base, { headers: { Origin: ALLOWED } });
    const body = await res.text();
    const open = JSON.parse(
      body.slice(body.indexOf("{"), body.indexOf("}") + 1),
    ) as { sid: string };
    // Open the default namespace.
    await fetch(`${base}&sid=${open.sid}`, {
      method: "POST",
      headers: { Origin: ALLOWED, "Content-Type": "text/plain" },
      body: "40",
    });
    await poll(open.sid);
    return open.sid;
  }

  async function poll(sid: string): Promise<string> {
    const res = await fetch(`${base}&sid=${sid}`, { headers: { Origin: ALLOWED } });
    return res.text();
  }

  async function send(sid: string, packet: string): Promise<void> {
    await fetch(`${base}&sid=${sid}`, {
      method: "POST",
      headers: { Origin: ALLOWED, "Content-Type": "text/plain" },
      body: packet,
    });
  }

  it("rejects a handshake from a disallowed origin", async () => {
    const res = await fetch(base, { headers: { Origin: "https://evil.example" } });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("sid");
  });

  it("accepts a handshake from an allowed origin", async () => {
    const res = await fetch(base, { headers: { Origin: ALLOWED } });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("sid");
  });

  it("accepts a handshake with no Origin header at all (native apps)", async () => {
    const res = await fetch(base);
    expect(res.status).toBe(200);
  });

  it("rejects an event name outside the client contract", async () => {
    const sid = await handshake();
    await send(sid, '42["bogus:event",{"x":1}]');
    expect(await poll(sid)).toContain("error:unknown_event");
  });

  it("accepts an event name inside the client contract", async () => {
    const sid = await handshake();
    await send(sid, '42["join:order","order-1"]');
    const next = await Promise.race([
      poll(sid),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), 1_000)),
    ]);
    expect(next).not.toContain("error:unknown_event");
  });
});
