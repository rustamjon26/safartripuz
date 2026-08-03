import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  createTaskSchema,
  listTasksQuerySchema,
  staffService,
} from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../_utils";

export async function GET(req: Request) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const url = new URL(req.url);
    const parsed = listTasksQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const data = await staffService.listTasks(actor.id, parsed.data.status);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const json = await req.json();
    const parsed = createTaskSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const task = await staffService.createTask(actor.id, parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return mapStaffError(e);
  }
}
