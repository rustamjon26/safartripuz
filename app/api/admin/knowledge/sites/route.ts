import { NextResponse } from "next/server";
import type { SiteCategory, SiteStatus } from "@prisma/client";
import { requireRole } from "@/lib/authz";
import {
  knowledgeService,
  SITE_CATEGORY_VALUES,
  SITE_STATUS_VALUES,
} from "@/src/modules/knowledge";

function authError(e: unknown): NextResponse | null {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "UNAUTHORIZED") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (msg === "FORBIDDEN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? undefined;
    const regionCode = searchParams.get("regionCode") ?? undefined;
    const statusRaw = searchParams.get("status") ?? "";
    const categoryRaw = searchParams.get("category") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));

    const status = (SITE_STATUS_VALUES as readonly string[]).includes(statusRaw)
      ? (statusRaw as SiteStatus)
      : undefined;
    const category = (SITE_CATEGORY_VALUES as readonly string[]).includes(
      categoryRaw,
    )
      ? (categoryRaw as SiteCategory)
      : undefined;

    const { items, total } = await knowledgeService.listSites({
      q,
      regionCode: regionCode || undefined,
      status,
      category,
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    console.error("[admin/knowledge/sites GET]", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const body: unknown = await req.json();
    const site = await knowledgeService.createSiteFromAdmin(body);
    return NextResponse.json({ item: site }, { status: 201 });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg.startsWith("Invalid site:") || msg.includes("slugify")) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    if (msg.startsWith("Site slug already exists:")) {
      return NextResponse.json({ message: msg }, { status: 409 });
    }
    if (msg.includes("Invalid time") || msg.includes("open hours")) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    console.error("[admin/knowledge/sites POST]", e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
