import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  authCookieOptions,
  hashToken,
  type AppRole,
} from "@/lib/auth";
import { randomBytes } from "node:crypto";

export async function GET(req: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://safartrip.uz";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          first_name: googleUser.given_name || googleUser.name?.split(" ")[0] || "",
          last_name: googleUser.family_name || googleUser.name?.split(" ")[1] || "",
          password: "",
          phone: `google_${randomBytes(8).toString("hex")}`,
          role: "user",
        },
      });
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
                : "/trip-builder";

    const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/login", baseUrl));
  }
}