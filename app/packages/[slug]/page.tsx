import { redirect } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";

const SLUG_TO_TRIP: Record<string, string> = {
  ekonom: "ekonom",
  econom: "ekonom",
  standart: "standart",
  premium: "premium",
};

export default async function PackagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const key = slug?.toLowerCase() ?? "";
  const pkg = SLUG_TO_TRIP[key];
  if (pkg) {
    redirect(loginWithNext(`/trip-builder?package=${encodeURIComponent(pkg)}`));
  }
  redirect("/hotels");
}
