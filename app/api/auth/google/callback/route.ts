import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  type AppRole,
} from "@/lib/auth";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { requireEnv } from "@/src/shared/env";
import { accountHomeForRole } from "@/lib/auth/accountHome";
import { GOOGLE_STATE_COOKIE } from "../_state";

const googleProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  verified_email: z.boolean().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string().optional(),
});

function statesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: Request) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://safartrip.uz";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const isProduction = process.env.NODE_ENV === "production";

  const failRedirect = (message: string) =>
    NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, baseUrl),
    );

  if (!code) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  if (!state || !expectedState || !statesMatch(state, expectedState)) {
    return failRedirect("Sessiya mos kelmadi. Qayta urinib ko'ring.");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("GOOGLE_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };

    if (!tokenData.access_token) {
      console.error("Google OAuth token exchange failed");
      return failRedirect("Google kirish xatosi. Qayta urinib ko'ring.");
    }

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    const profile = googleProfileSchema.safeParse(await userRes.json());
    if (!profile.success) {
      return failRedirect("Google profili o'qilmadi.");
    }
    const googleUser = profile.data;

    // Without a verified email Google's claim is no stronger than a self-signup.
    if (googleUser.verified_email === false) {
      return failRedirect("Google emailingiz tasdiqlanmagan.");
    }

    const email = googleUser.email.toLowerCase();
    let user =
      (await prisma.user.findUnique({ where: { googleId: googleUser.id } })) ??
      (await prisma.user.findUnique({ where: { email } }));

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          first_name:
            googleUser.given_name || googleUser.name?.split(" ")[0] || "",
          last_name:
            googleUser.family_name || googleUser.name?.split(" ")[1] || "",
          password: "",
          phone: `google_${randomBytes(8).toString("hex")}`,
          role: "user",
          emailVerifiedAt: new Date(),
          googleId: googleUser.id,
        },
      });
    } else {
      if (user.isBlocked) {
        return failRedirect("Hisobingiz bloklangan.");
      }
      if (user.googleId && user.googleId !== googleUser.id) {
        return failRedirect("Bu email boshqa Google hisobiga bog'langan.");
      }

      // An unverified password signup can be an attacker squatting on this
      // email. Google proved ownership, so that credential is dropped; the
      // real owner can set a new password from their profile.
      const dropsUnverifiedPassword =
        !user.emailVerifiedAt && user.password !== "";

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.id,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          ...(dropsUnverifiedPassword ? { password: "" } : {}),
        },
      });

      if (dropsUnverifiedPassword) {
        await prisma.refreshToken.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        console.warn("[auth] unverified password cleared on Google link", {
          userId: user.id,
        });
      }
    }

    const accessToken = await signAccessToken({
      sub: user.id,
      role: user.role as AppRole,
    });
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
      user.role === "user" ? "/trip-builder" : accountHomeForRole(user.role);

    const response = NextResponse.redirect(new URL(redirectUrl, baseUrl));

    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set(GOOGLE_STATE_COOKIE, "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return failRedirect("Server xatosi. Qayta urinib ko'ring.");
  }
}
