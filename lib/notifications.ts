import { sendPushToUser } from "@/lib/pushNotification";

export async function notifyCustomerOrderAccepted(
  customerId: string,
  orderId: string,
  driverName: string,
): Promise<void> {
  await sendPushToUser(customerId, {
    title: "Buyurtma qabul qilindi",
    body: `${driverName} buyurtmangizni qabul qildi`,
    data: { type: "taxi_order_accepted", orderId },
  });
}

export async function notifyCustomerDriverArrived(
  customerId: string,
  orderId: string,
): Promise<void> {
  await sendPushToUser(customerId, {
    title: "Haydovchi yetib keldi",
    body: "Haydovchi olib ketish manziliga yetib keldi",
    data: { type: "taxi_driver_arrived", orderId },
  });
}

export async function notifyCustomerOrderStarted(
  customerId: string,
  orderId: string,
): Promise<void> {
  await sendPushToUser(customerId, {
    title: "Safar boshlandi",
    body: "Safaringiz boshlandi",
    data: { type: "taxi_order_started", orderId },
  });
}

export async function notifyCustomerOrderCompleted(
  customerId: string,
  orderId: string,
  finalPrice: number,
): Promise<void> {
  await sendPushToUser(customerId, {
    title: "Safar yakunlandi",
    body: `To'lov summasi: ${finalPrice.toLocaleString("uz-UZ")} so'm`,
    data: { type: "taxi_order_completed", orderId, finalPrice },
  });
}

export async function notifyDriverOrderCancelled(
  driverId: string,
  orderId: string,
): Promise<void> {
  await sendPushToUser(driverId, {
    title: "Buyurtma bekor qilindi",
    body: "Mijoz buyurtmani bekor qildi",
    data: { type: "taxi_order_cancelled", orderId },
  });
}

export async function notifyDriverNewOrder(
  driverId: string,
  orderId: string,
  pickupAddress: string,
  estimatedPrice: number,
): Promise<void> {
  await sendPushToUser(driverId, {
    title: "Yangi buyurtma",
    body: `${pickupAddress} — ${estimatedPrice.toLocaleString("uz-UZ")} so'm`,
    data: { type: "taxi_order_new", orderId, pickupAddress, estimatedPrice },
  });
}
