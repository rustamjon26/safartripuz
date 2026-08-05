import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  listSupportThreadsQuerySchema,
  supportChatService,
} from "@/src/modules/supportchat";
import { mapSupportChatError, SUPPORT_AGENT_ROLES } from "../_utils";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const actor = await requireRole([...SUPPORT_AGENT_ROLES]);
    const url = new URL(req.url);
    const parsed = listSupportThreadsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const items = await supportChatService.listAsAgent(actor.id, {
      status: parsed.data.status,
      partyType: parsed.data.partyType,
      q: parsed.data.q,
    });
    return NextResponse.json({ items }, { status: 200 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}
