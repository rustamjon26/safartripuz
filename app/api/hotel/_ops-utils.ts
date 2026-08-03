import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getApprovedHotelContextByUserId } from "@/lib/hotel";
import { InvoiceNotFoundError, InvoiceStatusError } from "@/src/modules/invoice";
import { IntegrationNotFoundError } from "@/src/modules/integration";
import {
  ChannelNotFoundError,
  ChannelSyncStatusError,
  ChannelInboxStatusError,
} from "@/src/modules/channel";

export const HOTEL_OPS_ROLES = [
  "hotel_manager",
  "admin",
  "super_admin",
] as const;

export async function requireHotelOps() {
  const actor = await requireRole([...HOTEL_OPS_ROLES]);
  const ctx = await getApprovedHotelContextByUserId(actor.id);
  if (!ctx) {
    throw new Error("HOTEL_NOT_FOUND");
  }
  return { actor, hotelId: ctx.hotel.id, hotel: ctx.hotel };
}

export function mapHotelOpsError(e: unknown): NextResponse {
  if (e instanceof InvoiceNotFoundError || e instanceof ChannelNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  if (e instanceof IntegrationNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  if (
    e instanceof InvoiceStatusError ||
    e instanceof ChannelSyncStatusError ||
    e instanceof ChannelInboxStatusError
  ) {
    return NextResponse.json({ message: e.message }, { status: 409 });
  }
  const msg = e instanceof Error ? e.message : "Server error";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (msg === "HOTEL_NOT_FOUND") {
    return NextResponse.json({ message: "Hotel topilmadi" }, { status: 404 });
  }
  if (msg.startsWith("Invalid") || msg.includes("ulanmagan")) {
    return NextResponse.json({ message: msg }, { status: 400 });
  }
  console.error("[hotel-ops-api]", e);
  return NextResponse.json({ message: "Server error" }, { status: 500 });
}
