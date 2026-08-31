import { NextResponse } from "next/server";
import {
  StaffContextError,
  StaffNotFoundError,
  StaffShiftStatusError,
  StaffTaskStatusError,
} from "@/src/modules/staff";

export function mapStaffError(e: unknown): NextResponse {
  if (e instanceof StaffNotFoundError) {
    return NextResponse.json({ message: e.message }, { status: 404 });
  }
  if (e instanceof StaffContextError) {
    return NextResponse.json({ message: e.message }, { status: 403 });
  }
  if (e instanceof StaffShiftStatusError || e instanceof StaffTaskStatusError) {
    return NextResponse.json({ message: e.message }, { status: 409 });
  }
  const msg = e instanceof Error ? e.message : "Server error";
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
  if (msg === "ENROLLMENT_REQUIRED") {
    return NextResponse.json({ message: "Avval kursga yoziling" }, { status: 400 });
  }
  console.error("[staff-api]", e);
  return NextResponse.json({ message: "Server error" }, { status: 500 });
}

export const STAFF_ROLES = [
  "cleaner",
  "receptionist",
  "waiter",
  "hotel_staff",
  "hotel_manager",
  "admin",
  "super_admin",
] as const;
