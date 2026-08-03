import { NextResponse } from "next/server";
import {
  channelService,
  isOtaProviderKey,
} from "@/src/modules/channel";
import {
  connectIntegrationSchema,
  disconnectIntegrationSchema,
  integrationService,
} from "@/src/modules/integration";
import { mapHotelOpsError, requireHotelOps } from "../_ops-utils";

export async function GET() {
  try {
    const { hotelId } = await requireHotelOps();
    const groups = await integrationService.listGrouped(hotelId);
    return NextResponse.json({ groups });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const body: unknown = await req.json();
    const action =
      typeof body === "object" && body && "action" in body
        ? String((body as { action?: string }).action ?? "connect")
        : "connect";

    if (action === "disconnect") {
      const parsed = disconnectIntegrationSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { message: parsed.error.message },
          { status: 400 },
        );
      }
      const item = await integrationService.disconnect(hotelId, parsed.data);
      return NextResponse.json({ item });
    }

    const parsed = connectIntegrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const item = await integrationService.connect(hotelId, parsed.data);

    // Cloudbeds pattern: first connect → full ARI refresh job (stub adapter).
    let syncJob = null;
    if (
      item.category === "OTA" &&
      item.status === "CONNECTED" &&
      isOtaProviderKey(item.providerKey)
    ) {
      syncJob = await channelService.onOtaConnected(
        hotelId,
        item.providerKey,
      );
    }

    return NextResponse.json({ item, syncJob });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
