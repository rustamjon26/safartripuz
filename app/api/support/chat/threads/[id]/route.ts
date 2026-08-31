import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  patchSupportThreadSchema,
  supportChatService,
} from "@/src/modules/supportchat";
import { mapSupportChatError, SUPPORT_AGENT_ROLES } from "../../_utils";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx): Promise<NextResponse> {
  try {
    const actor = await requireRole([...SUPPORT_AGENT_ROLES]);
    const { id } = await ctx.params;
    const parsed = patchSupportThreadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi" },
        { status: 400 },
      );
    }
    await supportChatService.patchStatusAsAgent(
      actor.id,
      id,
      parsed.data.status,
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}
