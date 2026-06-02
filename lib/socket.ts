import { Server as SocketIOServer } from "socket.io";

export function getIO(): SocketIOServer | null {
  return (global as { io?: SocketIOServer }).io ?? null;
}

export function emitToOrder(orderId: string, event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
}

export function emitToDriver(driverId: string, event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.to(`driver:${driverId}`).emit(event, data);
  }
}
