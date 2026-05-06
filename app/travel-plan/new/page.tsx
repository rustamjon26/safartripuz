import { redirect } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";

export default async function TravelPlanNewPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination } = await searchParams;
  const d = destination?.trim().toLowerCase() || "";
  if (d) {
    redirect(loginWithNext(`/trip-builder?dest=${encodeURIComponent(d)}`));
  }
  redirect(loginWithNext("/trip-builder"));
}
