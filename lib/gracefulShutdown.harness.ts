/**
 * Test harness for lib/gracefulShutdown — not used in production.
 *
 * Starts an HTTP server whose /slow route takes 1.5s, prints its port, then
 * drains on SIGTERM exactly the way server.ts does.
 */
import { createServer } from "node:http";
import { createShutdownHandler, installSignalHandlers } from "./gracefulShutdown";

const httpServer = createServer((req, res) => {
  if (req.url?.startsWith("/slow")) {
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("slow-done");
    }, 1_500);
    return;
  }
  res.writeHead(200).end("ok");
});

httpServer.listen(0, () => {
  const address = httpServer.address();
  const port = typeof address === "object" && address ? address.port : 0;
  console.log(`READY ${port}`);
});

let databaseClosed = false;

const shutdown = createShutdownHandler({
  httpServer,
  closeDatabase: async () => {
    databaseClosed = true;
  },
  timeoutMs: 10_000,
  exit: (code) => {
    console.log(`EXIT ${code} databaseClosed=${databaseClosed}`);
    process.exit(code);
  },
});

installSignalHandlers(shutdown);
