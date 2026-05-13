import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { contentTypeForFile, resolveUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/uploads/<yyyy>/<mm>/<filename>
 *
 * Streams a stored upload from the configured `UPLOAD_DIR` back to the client.
 * Files are written by `POST /api/upload/images`. This route exists (instead
 * of relying on Next.js static serving of `public/`) so the storage directory
 * can live outside the Next standalone build folder and survive rebuilds.
 *
 * No auth required — image URLs are intentionally public; the underlying
 * filenames are unguessable UUIDs.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await ctx.params;
  const abs = resolveUploadPath(parts);
  if (!abs) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForFile(abs),
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
