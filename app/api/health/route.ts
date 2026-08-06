import { NextResponse } from "next/server";
import { healthService, httpStatusFor } from "@/src/modules/ops";

/** Always check live state (no static caching of /api/health). */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await healthService.check();
    return NextResponse.json(report, { status: httpStatusFor(report.status) });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        components: [
          {
            name: "health-check",
            status: "unhealthy",
            detail: error instanceof Error ? error.message : "check failed",
          },
        ],
      },
      { status: 503 },
    );
  }
}
