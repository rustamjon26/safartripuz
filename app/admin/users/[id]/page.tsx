export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/getAdminUserDetail";
import { AdminUserDetailClient } from "@/components/admin/users/AdminUserDetailClient";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminUserDetail(id);
  if (!data) notFound();

  return <AdminUserDetailClient data={data} />;
}
