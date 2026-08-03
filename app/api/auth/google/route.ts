import { NextResponse } from "next/server";
import { requireEnv } from "@/src/shared/env";

export async function GET() {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const baseUrl = process.env.NEXTAUTH_URL || "https://safartrip.uz";
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
