import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import {
  createSupportThreadSchema,
  supportChatService,
} from "@/src/modules/supportchat";
import { mapSupportChatError } from "../../_utils";

/** Party side: hotel / homestay / taxi / guide / customer. */
export async function GET(): Promise<NextResponse> {
  try {
    const actor = await requireUser();
    const items = await supportChatService.listAsParty(actor.id);
    return NextResponse.json({ items }, { status: 200 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const actor = await requireUser();
    const parsed = createSupportThreadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Validatsiya xatosi" },
        { status: 400 },
      );
    }
    const thread = await supportChatService.openThreadAsParty(
      actor.id,
      parsed.data,
    );
    return NextResponse.json({ thread }, { status: 201 });
  } catch (e) {
    return mapSupportChatError(e);
  }
}
