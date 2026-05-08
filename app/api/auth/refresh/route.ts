import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  authCookieOptions,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth";

export async function POST() {
  try {
    const token = (await cookies()).get("refresh_token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sub } = await verifyRefreshToken(token);
    const tokenHash = hashToken(token);

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const refreshRow = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!refreshRow) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const nextAccess = await signAccessToken({ sub: user.id, role: user.role });
    const nextRefresh = await signRefreshToken({ sub: user.id });
    const nextRefreshHash = hashToken(nextRefresh);
    const nextRefreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: refreshRow.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          tokenHash: nextRefreshHash,
          userId: user.id,
          expiresAt: nextRefreshExpiresAt,
        },
      }),
    ]);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.cookies.set("access_token", nextAccess, {
      ...authCookieOptions,
      maxAge: 60 * 15,
    });
    res.cookies.set("refresh_token", nextRefresh, {
      ...authCookieOptions,
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
