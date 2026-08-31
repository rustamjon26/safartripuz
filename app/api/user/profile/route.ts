import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { normalizeUzPhone } from "@/src/shared/phone";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().max(100).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
});

async function updateProfile(req: Request) {
  const { id } = await requireUser();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Validation error" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { first_name: true, last_name: true, email: true, phone: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Foydalanuvchi topilmadi" }, { status: 404 });
  }

  let first_name = existing.first_name;
  let last_name = existing.last_name;

  if (body.name) {
    const parts = body.name.split(/\s+/).filter(Boolean);
    first_name = parts[0] ?? first_name;
    last_name = parts.length > 1 ? parts.slice(1).join(" ") : last_name;
  }
  if (body.first_name) first_name = body.first_name;
  if (body.last_name !== undefined) last_name = body.last_name;

  if (!first_name.trim()) {
    return NextResponse.json({ message: "Ism majburiy" }, { status: 400 });
  }
  // Google accounts often have empty family_name — allow blank last name.
  last_name = (last_name ?? "").trim();

  let phone = existing.phone;
  if (body.phone !== undefined) {
    const normalized = normalizeUzPhone(body.phone);
    if (!normalized) {
      return NextResponse.json(
        {
          message:
            "Telefon formati noto‘g‘ri. Masalan: +998901234567 yoki 901234567",
        },
        { status: 400 },
      );
    }
    const taken = await prisma.user.findFirst({
      where: { phone: normalized, NOT: { id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { message: "Bu telefon raqami band" },
        { status: 409 },
      );
    }
    phone = normalized;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      first_name: first_name.trim(),
      last_name,
      phone,
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      phone: true,
      hotelStaff: { select: { role: true } },
    },
  });

  return NextResponse.json({ user }, { status: 200 });
}

export async function PUT(req: Request) {
  try {
    return await updateProfile(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("[user/profile] PUT failed", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

/** Some proxies/clients mishandle PUT — PATCH does the same update. */
export async function PATCH(req: Request) {
  try {
    return await updateProfile(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    console.error("[user/profile] PATCH failed", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
