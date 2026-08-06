/**
 * Runs public/sw.js inside a fake ServiceWorkerGlobalScope and drives its
 * handlers, rather than grepping the source.
 *
 * The regression it guards: the generated worker matched every same-origin GET
 * /api/* with NetworkFirst and a 24-hour expiration, so an offline or slow
 * network served day-old bookings and payment state as current.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

const swPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "sw.js");
const ORIGIN = "https://safartrip.uz";

type Handler = (event: FakeEvent) => void;

type FakeEvent = {
  request: { url: string; method: string };
  respondWith: (value: unknown) => void;
  waitUntil: (value: Promise<unknown>) => void;
};

class FakeCache {
  entries = new Map<string, unknown>();
  async match(req: { url: string }) {
    return this.entries.get(req.url);
  }
  async put(req: { url: string }, res: unknown) {
    this.entries.set(req.url, res);
  }
}

function loadWorker() {
  const handlers = new Map<string, Handler>();
  const caches = new Map<string, FakeCache>();
  const deleted: string[] = [];
  let claimed = false;
  let skippedWaiting = false;
  const fetched: string[] = [];

  const self: Record<string, unknown> = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: () => {
      skippedWaiting = true;
    },
    clients: {
      claim: async () => {
        claimed = true;
      },
    },
  };

  const cacheStorage = {
    keys: async () => [...caches.keys()],
    delete: async (name: string) => {
      deleted.push(name);
      return caches.delete(name);
    },
    open: async (name: string) => {
      if (!caches.has(name)) caches.set(name, new FakeCache());
      return caches.get(name)!;
    },
  };

  const sandbox = {
    self,
    caches: cacheStorage,
    URL,
    fetch: async (req: { url: string }) => {
      fetched.push(req.url);
      return { ok: true, type: "basic", clone: () => ({ cloned: true }) };
    },
    Promise,
    console,
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(swPath, "utf8"), sandbox);

  return { handlers, caches, deleted, fetched, get claimed() { return claimed; }, get skippedWaiting() { return skippedWaiting; } };
}

function fetchEvent(url: string, method = "GET") {
  let responded: unknown = undefined;
  let didRespond = false;
  const event: FakeEvent = {
    request: { url, method },
    respondWith: (value) => {
      didRespond = true;
      responded = value;
    },
    waitUntil: () => {},
  };
  return {
    event,
    get didRespond() {
      return didRespond;
    },
    get responded() {
      return responded;
    },
  };
}

describe("service worker", () => {
  let worker: ReturnType<typeof loadWorker>;

  beforeEach(() => {
    worker = loadWorker();
  });

  it("registers install, activate and fetch handlers", () => {
    expect([...worker.handlers.keys()].sort()).toEqual([
      "activate",
      "fetch",
      "install",
    ]);
  });

  const API_URLS = [
    `${ORIGIN}/api/hotel/bookings`,
    `${ORIGIN}/api/hotel/bookings?status=CONFIRMED`,
    `${ORIGIN}/api/auth/me`,
    `${ORIGIN}/api/payments/providers`,
    `${ORIGIN}/api/hotel/bookings/availability?checkInDate=2030-01-01`,
    `${ORIGIN}/api`,
  ];

  for (const url of API_URLS) {
    it(`never takes control of ${url.replace(ORIGIN, "")}`, () => {
      const probe = fetchEvent(url);
      worker.handlers.get("fetch")!(probe.event);
      // Not calling respondWith is the guarantee: the response cannot be read
      // from, or written to, any cache the worker owns.
      expect(probe.didRespond).toBe(false);
    });
  }

  it("does not cache HTML documents either", () => {
    const probe = fetchEvent(`${ORIGIN}/bookings`);
    worker.handlers.get("fetch")!(probe.event);
    expect(probe.didRespond).toBe(false);
  });

  it("still serves hashed static assets from cache", async () => {
    const url = `${ORIGIN}/_next/static/chunks/main-abc123.js`;
    const probe = fetchEvent(url);
    worker.handlers.get("fetch")!(probe.event);
    expect(probe.didRespond).toBe(true);
    await probe.responded;
    expect(worker.fetched).toContain(url);
  });

  it("ignores non-GET requests", () => {
    const probe = fetchEvent(`${ORIGIN}/_next/static/chunks/main.js`, "POST");
    worker.handlers.get("fetch")!(probe.event);
    expect(probe.didRespond).toBe(false);
  });

  it("ignores cross-origin requests", () => {
    const probe = fetchEvent("https://fonts.gstatic.com/x.woff2");
    worker.handlers.get("fetch")!(probe.event);
    expect(probe.didRespond).toBe(false);
  });

  it("deletes the legacy api cache from already-installed clients", async () => {
    // Names the previous workbox worker used.
    for (const legacy of ["apis", "others", "start-url", "next-data"]) {
      worker.caches.set(legacy, new FakeCache());
    }
    worker.caches.set("safartrip-v2-static", new FakeCache());

    let pending: Promise<unknown> | undefined;
    worker.handlers.get("activate")!({
      request: { url: "", method: "GET" },
      respondWith: () => {},
      waitUntil: (value) => {
        pending = value;
      },
    });
    await pending;

    expect(worker.deleted).toEqual(
      expect.arrayContaining(["apis", "others", "start-url", "next-data"]),
    );
    expect(worker.deleted).not.toContain("safartrip-v2-static");
    expect(worker.claimed).toBe(true);
  });

  it("takes over immediately so a stale worker cannot linger", () => {
    worker.handlers.get("install")!({
      request: { url: "", method: "GET" },
      respondWith: () => {},
      waitUntil: () => {},
    });
    expect(worker.skippedWaiting).toBe(true);
  });

  it("carries no precache manifest and no workbox import", () => {
    const source = readFileSync(swPath, "utf8");
    expect(source).not.toContain("precacheAndRoute");
    expect(source).not.toContain("importScripts");
    // The workbox runtime it used to pull in is gone from public/.
    expect(source).not.toMatch(/workbox-[0-9a-f]+\.js/);
  });
});
