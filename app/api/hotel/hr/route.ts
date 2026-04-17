import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const staff = await prisma.hotelStaff.findMany({
      where: { hotelId: ctx.hotel.id },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const { firstName, lastName, phone, role, email } = json;

    // 1. Generate random password for new staff
    const rawPassword = `staff${Math.random().toString(36).slice(-6)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 2. Transaksiyada User va Staff yaratish
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      let user = await tx.user.findUnique({ where: { email } });
      
      if (!user) {
        // Map staff role to platform role
        let platformRole: any = "hotel_staff";
        if (role === "CLEANER") platformRole = "cleaner";
        if (role === "RECEPTION") platformRole = "receptionist";
        if (role === "WAITER") platformRole = "waiter";

        user = await tx.user.create({
          data: {
            first_name: firstName,
            last_name: lastName || "",
            email: email,
            phone: phone || `+998${Math.floor(Math.random()*1000000000)}`,
            password: passwordHash,
            role: platformRole, 
          }
        });
      }

      const staff = await tx.hotelStaff.create({
        data: {
          hotelId: ctx.hotel.id,
          userId: user.id,
          firstName,
          lastName,
          phone,
          role,
          isActive: true
        }
      });

      return { staff, rawPassword };
    });

    return NextResponse.json({ 
      staff: result.staff, 
      generatedPassword: result.rawPassword 
    }, { status: 201 });
  } catch (error) {
    console.error("HR Create Error:", error);
    return NextResponse.json({ message: "Server error or email already exists" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const json = await req.json();
    const { id, ...data } = json;

    const staff = await prisma.hotelStaff.update({
      where: { id, hotelId: ctx.hotel.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive
      }
    });

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const actor = await requireRole(["hotel_manager"]);
    const ctx = await getApprovedHotelContextByUserId(actor.id);
    if (!ctx) return NextResponse.json({ message: "Hotel not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID missing" }, { status: 400 });

    const staff = await prisma.hotelStaff.findUnique({
      where: { id, hotelId: ctx.hotel.id },
      select: { userId: true }
    });

    if (!staff) return NextResponse.json({ message: "Staff not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // 1. Delete Staff first
      await tx.hotelStaff.delete({ where: { id } });
      // 2. Delete User if exists
      if (staff.userId) {
        await tx.user.delete({ where: { id: staff.userId } });
      }
    });

    return NextResponse.json({ message: "Xodim o'chirildi" }, { status: 200 });
  } catch (error) {
    console.error("Staff Delete Error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
