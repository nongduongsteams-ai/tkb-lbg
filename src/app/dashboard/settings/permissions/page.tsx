import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PermissionsClient from "./PermissionsClient";
import { getRolePermissions } from "@/actions/config";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const initialMapping = await getRolePermissions();

  return <PermissionsClient initialMapping={initialMapping} />;
}
