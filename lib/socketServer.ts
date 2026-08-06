import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  isClientEvent,
  isOriginAllowed,
  resolveAllowedOrigins,
} from "@/lib/socketEvents";

export type SocketServerOptions = {
  /** Defaults to `resolveAllowedOrigins()` (SOCKET_ALLOWED_ORIGINS + app URLs). */
  allowedOrigins?: readonly string[];
  log?: Pick<Console, "log" | "warn">;
};

/**
 * Attach the taxi realtime channel to an HTTP server.
 *
 * Lives outside server.ts so the origin and event rules can be exercised
 * without booting Next.js.
 */
export function attachSocketServer(
  httpServer: HttpServer,
  options: SocketServerOptions = {},
): SocketIOServer {
  const allowedOrigins = options.allowedOrigins ?? resolveAllowedOrigins();
  const log = options.log ?? console;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isOriginAllowed(origin, allowedOrigins)) {
          callback(null, true);
          return;
        }
        log.warn("[socket] rejected origin", origin);
        callback(new Error("Origin not allowed"));
      },
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // The websocket handshake does not pass through the CORS middleware, so the
  // origin list has to be enforced again here or `transports: ["websocket"]`
  // walks straight past it.
  io.use((socket, next) => {
    const origin = socket.handshake.headers.origin;
    if (isOriginAllowed(origin, allowedOrigins)) {
      next();
      return;
    }
    log.warn("[socket] rejected handshake origin", origin);
    next(new Error("Origin not allowed"));
  });

  io.on("connection", (socket) => {
    log.log("Socket connected:", socket.id);

    // Anything outside the client contract never reaches a handler.
    socket.onAny((event: string) => {
      if (!isClientEvent(event)) {
        log.warn("[socket] rejected event", { id: socket.id, event });
        socket.emit("error:unknown_event", { event });
      }
    });

    socket.on("join:order", (orderId: string) => {
      socket.join(`order:${orderId}`);
      log.log(`Socket ${socket.id} joined order:${orderId}`);
    });

    socket.on("join:driver", (driverId: string) => {
      socket.join(`driver:${driverId}`);
      log.log(`Socket ${socket.id} joined driver:${driverId}`);
    });

    socket.on(
      "driver:location",
      (data: {
        orderId: string;
        driverId: string;
        lat: number;
        lng: number;
      }) => {
        // Forward to the order room (customer sees it).
        io.to(`order:${data.orderId}`).emit("driver:location", {
          lat: data.lat,
          lng: data.lng,
          timestamp: Date.now(),
        });
      },
    );

    socket.on("disconnect", () => {
      log.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}
