import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { status, name, totalRooms, city, address, contactEmail, contactPhone } = body;

    const data: any = {};
    if (status !== undefined) {
      if (!["draft", "active", "suspended"].includes(status)) {
        return NextResponse.json({ message: "Noto'g'ri status" }, { status: 400 });
      }
      data.status = status;
    }
    if (name !== undefined) data.name = name;
    if (city !== undefined) data.city = city;
    if (address !== undefined) data.address = address;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (totalRooms !== undefined) data.totalRooms = Number(totalRooms);

    const hotel = await prisma.hotel.update({
      where: { id },
      data,
    });

    return NextResponse.json({ hotel });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await prisma.hotel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
