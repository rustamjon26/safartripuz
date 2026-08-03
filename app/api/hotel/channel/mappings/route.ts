import { NextResponse } from "next/server";
import { channelService, upsertMappingSchema } from "@/src/modules/channel";
import { mapHotelOpsError, requireHotelOps } from "../../_ops-utils";

export async function GET(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const providerKey =
      new URL(req.url).searchParams.get("providerKey") ?? undefined;
    const items = await channelService.listMappings(hotelId, providerKey);
    return NextResponse.json({ items });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const body: unknown = await req.json();
    const parsed = upsertMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.message },
        { status: 400 },
      );
    }
    const item = await channelService.upsertMapping(hotelId, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { hotelId } = await requireHotelOps();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "id required" }, { status: 400 });
    }
    await channelService.deleteMapping(hotelId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return mapHotelOpsError(e);
  }
}
