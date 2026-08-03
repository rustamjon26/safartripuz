import { NextResponse } from "next/server";
import { channelService, enqueueSyncSchema } from "@/src/modules/channel";
import { mapHotelOpsError, requireHotelOps } from "../../_ops-utils";

export async function GET() {
  try {
    const { hotelId } = await requireHotelOps();
    const items = await channelService.listJobs(hotelId);
    return NextResponse.json({ items });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const body: unknown = await req.json();
    const parsed = enqueueSyncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const runNow =
      typeof body === "object" &&
      body &&
      "runNow" in body &&
      Boolean((body as { runNow?: boolean }).runNow);

    const job = runNow
      ? await channelService.syncNow(hotelId, parsed.data)
      : await channelService.enqueueSync(hotelId, parsed.data);

    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
