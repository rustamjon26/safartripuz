import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getEffectiveApiBaseUrl } from "@/lib/api";

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: string;
}

interface OrderStatusUpdate {
  orderId: string;
  status: string;
  driverId?: string;
  vehicleId?: string;
}

interface UseOrderSocketOptions {
  orderId: string | null;
  onDriverLocation?: (loc: DriverLocation) => void;
  onStatusChange?: (update: OrderStatusUpdate) => void;
  onOrderAccepted?: (data: { orderId: string; driverId: string }) => void;
  onOrderCompleted?: (data: { finalPrice?: number }) => void;
  onOrderCancelled?: () => void;
}

export function useOrderSocket({
  orderId,
  onDriverLocation,
  onStatusChange,
  onOrderAccepted,
  onOrderCompleted,
  onOrderCancelled,
}: UseOrderSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(async () => {
    if (!orderId) return;

    const baseUrl = await getEffectiveApiBaseUrl();

    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:order", orderId);
      console.log("Socket connected, joined order:", orderId);
    });

    socket.on("driver:location", (data: DriverLocation) => {
      onDriverLocation?.(data);
    });

    socket.on("order:status", (data: OrderStatusUpdate) => {
      onStatusChange?.(data);
    });

    socket.on("order:accepted", (data: { orderId: string; driverId: string }) => {
      onOrderAccepted?.(data);
    });

    socket.on("order:completed", (data: { finalPrice?: number }) => {
      onOrderCompleted?.(data);
    });

    socket.on("order:cancelled", () => {
      onOrderCancelled?.();
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connect error:", err.message);
    });
  }, [orderId]);

  useEffect(() => {
    void connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  return {
    isConnected: socketRef.current?.connected ?? false,
  };
}
