import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  assertBatchWithinLimits,
  formatMb,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_BYTES,
  saveImage,
  UploadTooLargeError,
  type SavedImage,
} from "@/lib/uploads";

export const runtime = "nodejs";
// Avoid Next.js trying to cache or statically analyze this route.
export const dynamic = "force-dynamic";

/** Enough for a partner working through several listings in one sitting. */
const UPLOADS_PER_WINDOW = 20;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/upload/images
 *
 * Accepts multipart/form-data with one or more files under the `files` field
 * (repeatable). Returns the public URLs to use as image references.
 *
 *   Response: { urls: string[], items: SavedImage[] }
 *
 * Auth: any logged-in user (partners / admins).
 * Limits: 20 files and 40 MB per request, 10 MB per file, 20 requests/hour.
 */
export async function POST(req: Request) {
  try {
    const actor = await requireUser();

    if (
      !(await checkRateLimit(
        `upload:${actor.id}`,
        UPLOADS_PER_WINDOW,
        UPLOAD_WINDOW_MS,
      ))
    ) {
      return NextResponse.json(
        { message: "Juda ko'p yuklash. Birozdan so'ng qayta urining." },
        { status: 429 },
      );
    }

    // Reject on the declared size before formData() buffers the whole body
    // into memory. Absent or lying headers are caught by the check after parse.
    const declared = Number(req.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        {
          message: `Umumiy hajm ${formatMb(MAX_TOTAL_BYTES)} MB dan oshmasligi kerak`,
        },
        { status: 413 },
      );
    }

    const form = await req.formData();
    const entries = form.getAll("files");
    const files: File[] = entries.filter((e): e is File => e instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { message: "Hech qanday fayl yuborilmadi" },
        { status: 400 },
      );
    }
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          message: `Bir vaqtning o'zida eng ko'pi bilan ${MAX_FILES_PER_REQUEST} ta fayl yuklash mumkin`,
        },
        { status: 400 },
      );
    }

    // Whole batch is checked first, so a failure never leaves partial writes.
    assertBatchWithinLimits(files);

    const items: SavedImage[] = [];
    for (const file of files) {
      const saved = await saveImage(file);
      items.push(saved);
    }

    return NextResponse.json({ urls: items.map((i) => i.url), items });
  } catch (e) {
    if (e instanceof UploadTooLargeError) {
      return NextResponse.json({ message: e.message }, { status: 413 });
    }
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
