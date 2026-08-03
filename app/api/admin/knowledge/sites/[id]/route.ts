import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { knowledgeService } from "@/src/modules/knowledge";

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

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  ctx: RouteCtx,
): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const site = await knowledgeService.getSite(id);
    if (!site) {
      return NextResponse.json({ message: "Topilmadi" }, { status: 404 });
    }
    const eligibility = await knowledgeService.assessPublishEligibility(id);
    return NextResponse.json({ item: site, eligibility });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    console.error("[admin/knowledge/sites/:id GET]", e);
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: RouteCtx,
): Promise<NextResponse> {
  try {
    await requireRole(["admin", "super_admin"]);
    const { id } = await ctx.params;
    const body: unknown = await req.json();
    const site = await knowledgeService.updateSiteFromAdmin(id, body);
    const eligibility = await knowledgeService.assessPublishEligibility(id);
    return NextResponse.json({ item: site, eligibility });
  } catch (e) {
    const auth = authError(e);
    if (auth) return auth;
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg.startsWith("Site not found:")) {
      return NextResponse.json({ message: "Topilmadi" }, { status: 404 });
    }
    if (
      msg.startsWith("Invalid update:") ||
      msg.includes("Invalid time") ||
      msg.includes("open hours")
    ) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    console.error("[admin/knowledge/sites/:id PATCH]", e);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
