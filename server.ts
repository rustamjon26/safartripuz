import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

// Ensure Payme and other runtime secrets are loaded under PM2 before Next.js starts.
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

// Sentry for custom Node server (Socket.IO shares this process). No-op without DSN.
if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./sentry.server.config");
}

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const ALLOWED_EVENTS = [
  "driver:location",
  "order:status",
  "order:accepted",
  "order:arrived",
  "order:started",
  "order:completed",
  "order:cancelled",
];

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Store io globally so API routes can emit events
  (global as { io?: SocketIOServer }).io = io;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Client joins a room by orderId
    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined order:${orderId}`);
    });

    // Driver joins their own room
    socket.on("join:driver", (driverId: string) => {
      socket.join(`driver:${driverId}`);
      console.log(`Socket ${socket.id} joined driver:${driverId}`);
    });

    // Driver sends location update
    socket.on(
      "driver:location",
      (data: {
        orderId: string;
        driverId: string;
        lat: number;
        lng: number;
      }) => {
        // Forward to the order room (customer sees it)
        io.to(`order:${data.orderId}`).emit("driver:location", {
          lat: data.lat,
          lng: data.lng,
          timestamp: Date.now(),
        });
      },
    );

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
