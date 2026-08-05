import { NextResponse } from "next/server";
import {
  SupportChatForbiddenError,
  SupportChatNotFoundError,
} from "@/src/modules/supportchat";

export function mapSupportChatError(e: unknown): NextResponse {
  if (e instanceof SupportChatNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  if (e instanceof SupportChatForbiddenError) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json(
      { message: "Seans muddati tugagan. Qayta kiring." },
      { status: 401 },
    );
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json(
      { message: "Bu amal uchun ruxsat yo'q." },
      { status: 403 },
    );
  }
  console.error("[support-chat]", e);
  return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
}

export const SUPPORT_AGENT_ROLES = ["support", "admin", "super_admin"] as const;
