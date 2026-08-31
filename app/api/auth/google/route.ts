import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireEnv } from "@/src/shared/env";
import { GOOGLE_STATE_COOKIE } from "./_state";

export async function GET() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const baseUrl = process.env.NEXTAUTH_URL || "https://safartrip.uz";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}
