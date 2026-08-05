/**
 * The upload endpoint accepted 20 files × 10 MB with no ceiling on the request
 * as a whole and no rate limit, so one authenticated account could push 200 MB
 * per call, as often as it liked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const allowRequest = vi.hoisted(() => ({ value: true }));
const saveImage = vi.hoisted(() =>
  vi.fn(async (file: File) => ({
    url: `/api/uploads/2026/08/${file.name}`,
    size: file.size,
    mime: file.type,
  })),
);

vi.mock("@/lib/authz", () => ({
  requireUser: async () => ({ id: "u1", role: "user" }),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async () => allowRequest.value,
}));

vi.mock("@/lib/uploads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/uploads")>();
  return { ...actual, saveImage };
});

import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "@/lib/uploads";
import { POST } from "./route";

function imageFile(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

function uploadRequest(files: File[], declaredLength?: number): Request {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const headers = new Headers();
  if (declaredLength !== undefined) {
    headers.set("content-length", String(declaredLength));
  }
  return new Request("https://safartrip.uz/api/upload/images", {
    method: "POST",
    body: form,
    headers,
  });
}

async function post(files: File[], declaredLength?: number) {
  const res = await POST(uploadRequest(files, declaredLength));
  return { status: res.status, body: (await res.json()) as { message?: string } };
}

beforeEach(() => {
  allowRequest.value = true;
  saveImage.mockClear();
});

describe("per-file size cap", () => {
  it("rejects a file over the per-file limit with a clear message", async () => {
    const res = await post([imageFile("big.jpg", MAX_FILE_BYTES + 1)]);

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/10 MB dan oshmasligi/);
  });

  it("writes nothing when one file in the batch is too big", async () => {
    const res = await post([
      imageFile("ok1.jpg", 1024),
      imageFile("ok2.jpg", 1024),
      imageFile("big.jpg", MAX_FILE_BYTES + 1),
    ]);

    expect(res.status).toBe(413);
    // The batch is validated up front, so no partial writes are left behind.
    expect(saveImage).not.toHaveBeenCalled();
  });
});

describe("total request size cap", () => {
  it("rejects a batch whose total exceeds the request limit", async () => {
    const each = 6 * 1024 * 1024;
    const files = Array.from({ length: 8 }, (_, i) =>
      imageFile(`f${i}.jpg`, each),
    );
    expect(files.length * each).toBeGreaterThan(MAX_TOTAL_BYTES);

    const res = await post(files);

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/Umumiy hajm 40 MB/);
    expect(saveImage).not.toHaveBeenCalled();
  });

  it("rejects on the declared content-length before reading the body", async () => {
    const res = await post(
      [imageFile("small.jpg", 1024)],
      MAX_TOTAL_BYTES + 1,
    );

    expect(res.status).toBe(413);
    expect(saveImage).not.toHaveBeenCalled();
  });

  it("accepts a batch inside both limits", async () => {
    const res = await post([
      imageFile("a.jpg", 2 * 1024 * 1024),
      imageFile("b.jpg", 2 * 1024 * 1024),
    ]);

    expect(res.status).toBe(200);
    expect(saveImage).toHaveBeenCalledTimes(2);
  });
});

describe("rate limit", () => {
  it("returns 429 once the window is exhausted", async () => {
    allowRequest.value = false;

    const res = await post([imageFile("a.jpg", 1024)]);

    expect(res.status).toBe(429);
    expect(saveImage).not.toHaveBeenCalled();
  });
});
