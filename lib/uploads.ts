import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Where uploaded files live on disk.
 *
 * Configurable via the `UPLOAD_DIR` env var so production deploys can point
 * to a path OUTSIDE the Next.js standalone build (which is wiped on every
 * rebuild). On a typical VPS deploy:
 *
 *   UPLOAD_DIR=/var/www/safar/uploads
 *
 * In dev, defaults to `<project_root>/uploads`.
 *
 * The directory is created on first use, so no manual mkdir is required.
 */
export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), "uploads");
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_REQUEST = 20;

export type SavedImage = {
  url: string;
  size: number;
  mime: string;
};

/**
 * Persist a single uploaded image to disk and return the public URL the client
 * should display / store. Files are partitioned by year/month to keep any one
 * directory small.
 *
 * Throws an `Error` with a user-friendly message on validation failure.
 */
export async function saveImage(file: File): Promise<SavedImage> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(
      `Qo'llab-quvvatlanmaydigan fayl turi: ${file.type || "unknown"}`,
    );
  }
  if (file.size <= 0) {
    throw new Error("Bo'sh fayl yuklab bo'lmaydi");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `Fayl hajmi ${(MAX_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB dan oshmasligi kerak`,
    );
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${randomUUID().replace(/-/g, "")}.${ext}`;

  const relDir = path.posix.join(yyyy, mm);
  const absDir = path.join(getUploadRoot(), yyyy, mm);
  await mkdir(absDir, { recursive: true });

  const absPath = path.join(absDir, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(absPath, buf);

  return {
    url: `/api/uploads/${relDir}/${filename}`,
    size: file.size,
    mime: file.type,
  };
}

/**
 * Resolve a requested public URL path (e.g. "2026/05/abc.jpg") to an absolute
 * filesystem path under the upload root, refusing any traversal attempts.
 * Returns `null` if the path is malformed.
 */
export function resolveUploadPath(parts: string[]): string | null {
  if (!parts.length) return null;
  for (const seg of parts) {
    if (
      !seg ||
      seg === "." ||
      seg === ".." ||
      seg.includes("\0") ||
      seg.includes("/") ||
      seg.includes("\\")
    ) {
      return null;
    }
  }
  const root = getUploadRoot();
  const abs = path.join(root, ...parts);
  // Ensure resolved path stays inside the upload root.
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  return abs;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export function contentTypeForFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";
}
