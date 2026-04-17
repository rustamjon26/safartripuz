import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";

export async function requireTaxiAdmin() {
  return requireRole(["admin", "super_admin"]);
}

export function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function unauthorizedResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : "Server xatosi";
  if (msg === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (msg === "FORBIDDEN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}
