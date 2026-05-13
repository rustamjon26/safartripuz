import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { MAX_FILES_PER_REQUEST, saveImage, type SavedImage } from "@/lib/uploads";

export const runtime = "nodejs";
// Avoid Next.js trying to cache or statically analyze this route.
export const dynamic = "force-dynamic";

/**
 * POST /api/upload/images
 *
 * Accepts multipart/form-data with one or more files under the `files` field
 * (repeatable). Returns the public URLs to use as image references.
 *
 *   Response: { urls: string[], items: SavedImage[] }
 *
 * Auth: any logged-in user (partners / admins).
 */
export async function POST(req: Request) {
  try {
    await requireUser();

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

    const items: SavedImage[] = [];
    for (const file of files) {
      const saved = await saveImage(file);
      items.push(saved);
    }

    return NextResponse.json({ urls: items.map((i) => i.url), items });
  } catch (e) {
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
