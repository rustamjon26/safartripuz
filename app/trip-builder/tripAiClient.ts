import { z } from "zod";

/** Client-side TripAI plan DTO — mirrors PlanResult without Prisma imports. */
const claimSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    established: z.boolean(),
    folklore: z.boolean(),
  })
  .passthrough();

const slotSchema = z.object({
  day: z.number().int(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["PLACED", "NO_DATA"]),
  siteId: z.string().nullable(),
  siteName: z.string().nullable(),
  claims: z.array(claimSchema),
});

const daySchema = z.object({
  day: z.number().int(),
  date: z.string(),
  title: z.string(),
  slots: z.array(slotSchema),
});

const planSchema = z.object({
  regionCode: z.string(),
  regionDisplay: z.string(),
  lang: z.enum(["uz", "ru", "en"]),
  days: z.array(daySchema),
  narration: z.string(),
  claims: z.array(claimSchema),
  meta: z.object({
    dataCoverage: z.enum(["full", "partial", "none"]),
    missing: z.array(z.string()),
    narrationSource: z.enum(["llm", "template"]),
  }),
});

export type TripAiPlan = z.infer<typeof planSchema>;
export type TripAiPlanDay = z.infer<typeof daySchema>;
export type TripAiPlanSlot = z.infer<typeof slotSchema>;

/** Date-only `YYYY-MM-DD` → ISO datetime for Zod `.datetime()` on the API. */
export function toPlanIsoDatetime(dateOnly: string): string {
  return `${dateOnly}T12:00:00.000Z`;
}

export type FetchTripAiPlanInput = {
  region: string;
  startDate: string;
  endDate: string;
  pax?: number;
  lang?: "uz" | "ru" | "en";
};

export type FetchTripAiPlanResult =
  | { ok: true; plan: TripAiPlan }
  | { ok: false; status: number; message: string };

export async function fetchTripAiPlan(
  input: FetchTripAiPlanInput,
): Promise<FetchTripAiPlanResult> {
  const res = await fetch("/api/trip-ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      region: input.region,
      startDate: toPlanIsoDatetime(input.startDate),
      endDate: toPlanIsoDatetime(input.endDate),
      lang: input.lang ?? "uz",
      pax: input.pax,
    }),
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errSchema = z.object({ message: z.string() }).passthrough();
    const errParsed = errSchema.safeParse(json);
    return {
      ok: false,
      status: res.status,
      message: errParsed.success ? errParsed.data.message : "TripAI xatosi",
    };
  }

  const parsed = planSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      status: 500,
      message: "TripAI javobi noto'g'ri formatda",
    };
  }

  return { ok: true, plan: parsed.data };
}

export function coverageHint(
  coverage: TripAiPlan["meta"]["dataCoverage"],
): string | null {
  if (coverage === "partial") {
    return "Ba'zi joylar uchun ma'lumot yetarli emas — reja qisman to'ldirilgan.";
  }
  if (coverage === "none") {
    return "Bu hududda nashr qilingan joylar topilmadi.";
  }
  return null;
}
