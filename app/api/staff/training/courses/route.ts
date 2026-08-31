import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../_utils";

export async function GET() {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const data = await staffService.listCourses(actor.id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}
