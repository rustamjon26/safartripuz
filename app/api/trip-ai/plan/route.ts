import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { plannerService } from "@/src/modules/tripai";

const schema = z
  .object({
    region: z.string().trim().min(2).max(80),
    days: z.number().int().min(1).max(14).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    lang: z.enum(["uz", "ru", "en"]).optional(),
    pax: z.number().int().min(1).max(20).optional(),
  })
  .superRefine((val, ctx) => {
    const hasRange = Boolean(val.startDate && val.endDate);
    const hasDays = val.days != null;
    if (!hasRange && !hasDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide days or startDate+endDate",
        path: ["days"],
      });
    }
    if (val.startDate && val.endDate) {
      const start = new Date(val.startDate);
      const end = new Date(val.endDate);
      if (!(end >= start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endDate must be on or after startDate",
          path: ["endDate"],
        });
      }
    }
  });

export async function POST(req: Request) {
  try {
    await requireUser();
    const json: unknown = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const plan = await plannerService.createPlan({
      region: body.region,
      days: body.days,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      interests: body.interests,
      lang: body.lang,
      pax: body.pax,
    });

    return NextResponse.json(plan, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
