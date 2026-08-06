import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createShutdownHandler } from "./gracefulShutdown";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type FakeServer = {
  close: (cb: () => void) => void;
  closeIdleConnections: () => void;
};

function fakeHttpServer(closeDelayMs = 0): FakeServer {
  return {
    close: (cb) => setTimeout(cb, closeDelayMs),
    closeIdleConnections: () => {},
  };
}

describe("createShutdownHandler", () => {
  it("closes realtime, HTTP and the database in that order, then exits 0", async () => {
    const order: string[] = [];
    const exits: number[] = [];

    const shutdown = createShutdownHandler({
      httpServer: fakeHttpServer() as never,
      closeRealtime: () => {
        order.push("realtime");
      },
      closeApp: async () => {
        order.push("app");
      },
      closeDatabase: async () => {
        order.push("database");
      },
      log: { log: () => {}, error: () => {} } as never,
      exit: (code) => {
        exits.push(code);
      },
    });

    await shutdown("SIGTERM");
    expect(order).toEqual(["realtime", "app", "database"]);
    expect(exits).toEqual([0]);
  });

  it("ignores a second signal so a double SIGTERM cannot re-enter the drain", async () => {
    let closes = 0;
    const shutdown = createShutdownHandler({
      httpServer: fakeHttpServer() as never,
      closeDatabase: async () => {
        closes += 1;
      },
      log: { log: () => {}, error: () => {} } as never,
      exit: () => {},
    });

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);
    expect(closes).toBe(1);
  });

  it("exits 1 if the drain hangs past the timeout", async () => {
    const exits: number[] = [];
    const shutdown = createShutdownHandler({
      // Never calls back — models a connection that refuses to drain.
      httpServer: { close: () => {}, closeIdleConnections: () => {} } as never,
      timeoutMs: 50,
      log: { log: () => {}, error: () => {} } as never,
      exit: (code) => {
        exits.push(code);
      },
    });

    void shutdown("SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(exits).toEqual([1]);
  });
});

describe("SIGTERM against a live server", () => {
  it("lets an in-flight request finish before the process exits", async () => {
    const child = spawn(
      path.join(repoRoot, "node_modules/.bin/tsx"),
      [path.join(repoRoot, "lib/gracefulShutdown.harness.ts")],
      { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
    );

    const stdout: string[] = [];
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));

    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("harness never started")), 60_000);
      child.stdout.on("data", (chunk: string) => {
        const match = /READY (\d+)/.exec(chunk);
        if (match) {
          clearTimeout(timer);
          resolve(Number(match[1]));
        }
      });
      child.on("exit", (code) => reject(new Error(`harness exited early: ${code}`)));
    });

    const inFlight = fetch(`http://127.0.0.1:${port}/slow`);
    // Give the request time to reach the server, then pull the rug.
    await new Promise((resolve) => setTimeout(resolve, 250));
    child.kill("SIGTERM");

    const response = await inFlight;
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("slow-done");

    const exitCode = await new Promise<number | null>((resolve) =>
      child.on("exit", resolve),
    );
    expect(exitCode).toBe(0);

    const output = stdout.join("");
    expect(output).toContain("SIGTERM received; draining");
    expect(output).toContain("drained cleanly");
    expect(output).toContain("EXIT 0 databaseClosed=true");

    // New connections are refused once draining starts.
    await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
  }, 120_000);
});
