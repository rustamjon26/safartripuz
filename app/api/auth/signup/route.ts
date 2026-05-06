import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  authCookieOptions,
  signAccessToken,
  signRefreshToken,
} from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().trim().min(2).optional(),
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).optional(),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\+998\d{9}$/),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
});

function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return { first_name: "User", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = signupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let first_name = parsed.data.first_name?.trim();
    let last_name = parsed.data.last_name?.trim();
    if (parsed.data.name?.trim()) {
      const s = splitName(parsed.data.name);
      first_name = s.first_name;
      last_name = s.last_name;
    }
    if (!first_name || !last_name) {
      return NextResponse.json(
        { message: "Ism yoki first_name/last_name majburiy" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const { phone, password } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Email yoki telefon allaqachon ro'yxatdan o'tgan" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        phone,
        password: passwordHash,
        role: "user",
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const access = await signAccessToken({ sub: user.id, role: user.role });
    const refresh = await signRefreshToken({ sub: user.id });
    const refreshHash = hashToken(refresh);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    const res = NextResponse.json(
      {
        accessToken: access,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
      { status: 201 },
    );

    res.cookies.set("access_token", access, {
      ...authCookieOptions(),
      maxAge: 60 * 15,
    });
    res.cookies.set("refresh_token", refresh, {
      ...authCookieOptions(),
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
