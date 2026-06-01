import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/authz";
import { assertHotelAccess, HOTEL_ROOM_WRITE_ROLES } from "@/lib/hotel/assertHotelAccess";
import { getHotelReports, HotelReportsError } from "@/lib/hotel/getHotelReports";
import {
  buildReportPdfFilename,
  generateReportPdf,
} from "@/lib/hotel/reports/generateReportPdf";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  group_by: z.enum(["day", "week", "month"]).default("day"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole([...HOTEL_ROOM_WRITE_ROLES]);
    const { id: hotelId } = await params;

    const hotelAccess = await assertHotelAccess(actor.id, actor.role, hotelId);
    if (!hotelAccess) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi yoki ruxsat yo'q" },
        { status: 404 },
      );
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validatsiya xatosi", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });
    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "Mehmonxona topilmadi" },
        { status: 404 },
      );
    }

    const report = await getHotelReports({
      hotelId,
      start: parsed.data.start,
      end: parsed.data.end,
      groupBy: parsed.data.group_by,
    });

    const pdfBuffer = await generateReportPdf({
      hotelName: hotel.name,
      report,
      generatedAt: new Date(),
    });

    const filename = buildReportPdfFilename(parsed.data.end);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof HotelReportsError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }

    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    console.error("Hotel reports PDF export error:", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}
