import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  sendSupportMessageSchema,
  supportChatService,
} from "@/src/modules/supportchat";
import { mapSupportChatError, SUPPORT_AGENT_ROLES } from "../../../_utils";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    const actor = await requireRole([...SUPPORT_AGENT_ROLES]);
    const { id } = await ctx.params;
    const data = await supportChatService.getMessagesForAgent(actor.id, id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}

export async function POST(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    const actor = await requireRole([...SUPPORT_AGENT_ROLES]);
    const { id } = await ctx.params;
    const parsed = sendSupportMessageSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi" },
        { status: 400 },
      );
    }
    const message = await supportChatService.sendAsAgent(
      actor.id,
      id,
      parsed.data.body,
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}
