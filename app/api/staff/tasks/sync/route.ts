import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../../_utils";

/** Sync open HousekeepingTask rows into StaffOpsTask (idempotent). */
export async function POST() {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const result = await staffService.syncHousekeeping(actor.id);
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}
