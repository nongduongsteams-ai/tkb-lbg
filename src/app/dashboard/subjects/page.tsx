import { getSubjects } from "@/actions/subject";
import SubjectClient from "./SubjectClient";
import { getSupportedGrades, getRolePermissions } from "@/actions/config";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEffectiveActions } from "@/lib/serverPermissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubjectsPage() {
  const [supportedGrades, roleMappings, session] = await Promise.all([
    getSupportedGrades(),
    getRolePermissions(),
    getServerSession(authOptions)
  ]);

  const effectiveActionsSet = await getEffectiveActions(session);
  
  let userId: string | undefined;
  if (session?.user) {
    userId = (session.user as any).id as string;
  }

  const isFullAccess = effectiveActionsSet.has("ADMIN") || effectiveActionsSet.has("MANAGE_SUBJECTS");
  const result = await getSubjects("2026-2027", userId, isFullAccess);
  const initialSubjects: any[] = result.success && result.data ? result.data : [];

  return <SubjectClient 
    initialSubjects={initialSubjects} 
    supportedGrades={supportedGrades} 
    userActions={Array.from(effectiveActionsSet)}
  />;
}
