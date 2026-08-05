// Loads .env/.env.local under PM2 and refuses to start on bad config.
// Must stay the first import — see src/shared/boot.ts.
import "./src/shared/boot";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import type { Server as SocketIOServer } from "socket.io";
import { attachSocketServer } from "./lib/socketServer";
import {
  createShutdownHandler,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  installSignalHandlers,
} from "./lib/gracefulShutdown";

// Sentry for custom Node server (Socket.IO shares this process). No-op without DSN.
if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./sentry.server.config");
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const io = attachSocketServer(httpServer);

  // Store io globally so API routes can emit events
  (global as { io?: SocketIOServer }).io = io;

  const port = parseInt(process.env.PORT ?? "3000", 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

  const shutdown = createShutdownHandler({
    httpServer,
    closeRealtime: () => io.close(),
    closeApp: () => app.close(),
    closeDatabase: async () => {
      const { prisma } = await import("./lib/prisma");
      await prisma.$disconnect();
    },
    timeoutMs: Number(
      process.env.SHUTDOWN_TIMEOUT_MS ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    ),
  });

  installSignalHandlers(shutdown);
});
