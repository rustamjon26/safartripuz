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

const signinSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = signinSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const password = parsed.data.password;
    const email = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        password: true,
        role: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Email topilmadi" }, { status: 404 });
    }
    if (user.isBlocked) {
      return NextResponse.json(
        { message: "Hisobingiz bloklangan. Iltimos, admin bilan bog'laning." },
        { status: 403 },
      );
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return NextResponse.json({ message: "Parol noto'g'ri" }, { status: 401 });
    }

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
      { status: 200 },
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
