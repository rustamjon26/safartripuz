import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { patchStaffProfileSchema, staffService } from "@/src/modules/staff";
import { mapStaffError, STAFF_ROLES } from "../_utils";

export async function GET() {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const data = await staffService.profile(actor.id);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return mapStaffError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireRole([...STAFF_ROLES]);
    const parsed = patchStaffProfileSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validatsiya xatosi", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (
      parsed.data.firstName === undefined &&
      parsed.data.lastName === undefined &&
      parsed.data.phone === undefined
    ) {
      return NextResponse.json(
        { message: "Kamida bitta maydon kerak" },
        { status: 400 },
      );
    }

    const data = await staffService.patchProfile(actor.id, parsed.data);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === "VALIDATION") {
      return NextResponse.json(
        { message: "Kamida bitta maydon kerak" },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_INVALID") {
      return NextResponse.json(
        {
          message:
            "Telefon formati noto‘g‘ri. Masalan: +998901234567 yoki 901234567",
        },
        { status: 400 },
      );
    }
    if (e instanceof Error && e.message === "PHONE_TAKEN") {
      return NextResponse.json(
        { message: "Bu telefon raqami band" },
        { status: 409 },
      );
    }
    return mapStaffError(e);
  }
}
