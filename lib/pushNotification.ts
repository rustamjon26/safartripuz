import Expo, { ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
}

export async function sendPushNotification(
  token: string | null | undefined,
  payload: PushPayload,
): Promise<void> {
  if (!token || !Expo.isExpoPushToken(token)) return;

  const message: ExpoPushMessage = {
    to: token,
    sound: payload.sound ?? "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    badge: payload.badge,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          console.error("Push error:", ticket.message);
        }
      }
    }
  } catch (err) {
    console.error("Push notification failed:", err);
    // Never throw — push failure should not break order flow
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  const { prisma } = await import("./prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });
  await sendPushNotification(user?.expoPushToken, payload);
}
