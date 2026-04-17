import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Server error";
  if (message === "UNAUTHORIZED") return fail("Unauthorized", 401);
  if (message === "FORBIDDEN") return fail("Forbidden", 403);
  return fail("Server error", 500);
}
