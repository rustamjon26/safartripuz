import { Server as SocketIOServer } from "socket.io";
import { isServerEvent } from "@/lib/socketEvents";

export function getIO(): SocketIOServer | null {
  return (global as { io?: SocketIOServer }).io ?? null;
}

/**
 * Broadcast names are built from status strings in places, so an unknown name
 * means a typo or a new status nobody taught the clients about — log it instead
 * of emitting into a channel with no listeners.
 */
function assertKnownEvent(event: string): boolean {
  if (isServerEvent(event)) return true;
  console.warn("[socket] refusing to emit unknown event", event);
  return false;
}

export function emitToOrder(orderId: string, event: string, data: unknown) {
  if (!assertKnownEvent(event)) return;
  const io = getIO();
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
}

export function emitToDriver(driverId: string, event: string, data: unknown) {
  if (!assertKnownEvent(event)) return;
  const io = getIO();
  if (io) {
    io.to(`driver:${driverId}`).emit(event, data);
  }
}

// deliberate CI lint check — reverted before merge
export function deliberateLintError(value: any) {
  return value;
}
