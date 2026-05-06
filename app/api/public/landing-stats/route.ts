import { NextResponse } from "next/server";
import { getLandingStats } from "@/lib/landingStats";

export async function GET() {
  try {
    const stats = await getLandingStats();
    return NextResponse.json(stats);
  } catch (e) {
    console.error("landing-stats:", e);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
