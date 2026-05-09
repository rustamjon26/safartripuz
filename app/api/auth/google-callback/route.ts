import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  authCookieOptions,
  hashToken,
  type AppRole,
} from "@/lib/auth";
import { authOptions } from "../[...nextauth]/route";

export async function GET(req: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://safartrip.uz";
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const accessToken = await signAccessToken({ sub: user.id, role: user.role as AppRole });
  const refreshToken = await signRefreshToken({ sub: user.id });
  const hashedRefresh = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashedRefresh,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const redirectUrl =
    user.role === "admin" || user.role === "super_admin"
      ? "/admin"
      : user.role === "hotel_manager"
        ? "/hotel"
        : user.role === "home_stay_partner"
          ? "/homestay-partner"
          : user.role === "guide"
            ? "/guide-partner"
            : user.role === "taxi"
              ? "/taxi-partner"
              : "/";

  const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

  response.cookies.set("access_token", accessToken, {
    ...authCookieOptions,
    maxAge: 60 * 15,
  });
  response.cookies.set("refresh_token", refreshToken, {
    ...authCookieOptions,
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
