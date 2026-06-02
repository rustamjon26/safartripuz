import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "@/lib/constants";

interface UseDriverSocketOptions {
  driverId: string | null;
  isOnline: boolean;
  onNewOrder?: (order: unknown) => void;
  onOrderCancelled?: (orderId: string) => void;
}

export function useDriverSocket({
  driverId,
  isOnline,
  onNewOrder,
  onOrderCancelled,
}: UseDriverSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!driverId || !isOnline) return;

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:driver", driverId);
      console.log("Driver socket connected");
    });

    socket.on("order:new", (order: unknown) => {
      onNewOrder?.(order);
    });

    socket.on("order:cancelled", (data: { orderId: string }) => {
      onOrderCancelled?.(data.orderId);
    });

    socket.on("disconnect", () => {
      console.log("Driver socket disconnected");
    });
  }, [driverId, isOnline]);

  const emitLocation = useCallback(
    (data: { orderId: string; lat: number; lng: number }) => {
      socketRef.current?.emit("driver:location", {
        ...data,
        driverId,
      });
    },
    [driverId],
  );

  useEffect(() => {
    if (isOnline) {
      connect();
    } else {
      socketRef.current?.disconnect();
      socketRef.current = null;
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [isOnline, connect]);

  return { emitLocation };
}
