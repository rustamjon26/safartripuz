import { NextResponse } from "next/server";
import {
  channelService,
  ingestReservationSchema,
} from "@/src/modules/channel";
import { mapHotelOpsError, requireHotelOps } from "../../_ops-utils";

export async function GET() {
  try {
    const { hotelId } = await requireHotelOps();
    const items = await channelService.listReservations(hotelId);
    return NextResponse.json({ items });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

/** Manual / webhook-style ingest — idempotent by externalReservationId. */
export async function POST(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const body: unknown = await req.json();
    const parsed = ingestReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const result = await channelService.ingestReservation(hotelId, parsed.data);
    return NextResponse.json(result, {
      status: result.created ? 201 : 200,
    });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
