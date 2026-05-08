import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authCookieOptions, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const refreshToken = (await cookies()).get("refresh_token")?.value;
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set("access_token", "", { ...authCookieOptions, maxAge: 0 });
  res.cookies.set("refresh_token", "", { ...authCookieOptions, maxAge: 0 });
  return res;
}
