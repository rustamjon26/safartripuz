import type { TravelItemType } from "@prisma/client";

export type PlanTurFilter = "hotel" | "homestay" | "taxi" | "guide";

export type RevenueCategory = "HOTEL" | "HOMESTAY" | "TAXI" | "GUIDE" | "OTHER";

type PlanShape = {
  items: { type: TravelItemType }[];
  _count: {
    homeStayBookings: number;
    guideBookings: number;
    taxiOrders: number;
  };
};

/** Tags for filtering (plan may match multiple tur filters). */
export function travelPlanTurTags(plan: PlanShape): PlanTurFilter[] {
  const tags = new Set<PlanTurFilter>();
  if (plan._count.homeStayBookings > 0) tags.add("homestay");
  if (plan._count.guideBookings > 0) tags.add("guide");
  if (plan._count.taxiOrders > 0) tags.add("taxi");
  for (const it of plan.items) {
    if (it.type === "HOTEL") tags.add("hotel");
    if (it.type === "TAXI") tags.add("taxi");
    if (it.type === "GUIDE") tags.add("guide");
  }
  return Array.from(tags);
}

/** Single revenue bucket per payment (no double counting). */
export function travelPlanPrimaryRevenueCategory(plan: PlanShape): RevenueCategory {
  if (plan._count.homeStayBookings > 0) return "HOMESTAY";
  if (plan._count.guideBookings > 0) return "GUIDE";
  if (plan._count.taxiOrders > 0) return "TAXI";
  if (plan.items.some((i) => i.type === "HOTEL")) return "HOTEL";
  if (plan.items.some((i) => i.type === "GUIDE")) return "GUIDE";
  if (plan.items.some((i) => i.type === "TAXI")) return "TAXI";
  return "OTHER";
}
