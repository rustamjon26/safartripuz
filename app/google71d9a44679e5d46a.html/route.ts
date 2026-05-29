import { NextResponse } from "next/server";

const BODY = "google-site-verification: google71d9a44679e5d46a.html\n";

export async function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
