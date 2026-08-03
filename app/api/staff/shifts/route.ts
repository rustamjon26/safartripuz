import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { listShiftsQuerySchema, staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../_utils";

const createSchema = z.object({
  staffId: z.string().min(1),
  title: z.string().trim().min(1).max(191),
  location: z.string().trim().max(191).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET(req: Request) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const url = new URL(req.url);
    const parsed = listShiftsQuerySchema.safeParse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const data = await staffService.listShifts(actor.id, {
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}

/** Manager creates a shift for a staff member. */
export async function POST(req: Request) {
  try {
    const actor = await requireRole([
      "hotel_manager",
      "admin",
      "super_admin",
      "hotel_staff",
    ]);
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }
    const shift = await staffService.createShift(actor.id, parsed.data);
    return NextResponse.json({ shift }, { status: 201 });
  } catch (e) {
    return mapStaffError(e);
  }
}
