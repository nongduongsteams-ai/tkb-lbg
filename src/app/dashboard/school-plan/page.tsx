import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SchoolPlanClient from "./SchoolPlanClient";

import { getSupportedGrades, getRolePermissions } from "@/actions/config";
import { getSchoolPlans } from "@/actions/schoolPlan";
import { getEffectiveActions, canViewFullTimetable } from "@/lib/serverPermissions";

export default async function SchoolPlanPage() {
  const session = await getServerSession(authOptions);
  
  const currentYear = "2026-2027";
  const [roleMappings, supportedGrades] = await Promise.all([
    getRolePermissions(),
    getSupportedGrades()
  ]);

  const effectiveActions = new Set<string>();
  let userId: string | undefined;
  if (session?.user) {
    userId = (session.user as any).id as string;
    const role = (session.user as any).role as string;
    const permissions = (session.user as any).permissions as string[] || [];
    
    if (role === "ADMIN") {
      effectiveActions.add("ADMIN");
    } else {
      if (roleMappings[role]) roleMappings[role].forEach(a => effectiveActions.add(a));
      permissions.forEach(p => {
        if (roleMappings[p]) roleMappings[p].forEach(a => effectiveActions.add(a));
      });
    }
  }


  const effectiveActionsSet = await getEffectiveActions(session);
  let isFullAccess = effectiveActionsSet.has("ADMIN");
  
  if (!isFullAccess && effectiveActionsSet.has("MANAGE_SCHOOL_PLAN")) {
    const role = (session.user as any).role as string;
    const permissions = (session.user as any).permissions as string[] || [];
    const fullAccessRoles = ['BGH', 'BGH HT', 'BGH PHT', 'Tổ trưởng', 'Tổ phó'];
    if (fullAccessRoles.some(r => role.includes(r)) || permissions.some(p => fullAccessRoles.some(r => p.includes(r)))) {
      isFullAccess = true;
    }
  }

  const result = await getSchoolPlans(currentYear, userId, isFullAccess);
  let schoolPlans: any[] = result.success && result.data ? result.data : [];

  // GVBM: chỉ hiện môn phân công
  if (!isFullAccess && userId) {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: userId, schoolYear: currentYear },
      include: { class: true, subject: true }
    });
    const allowedSet = new Set<string>();
    assignments.forEach(a => {
      if (a.class && a.subject) {
        allowedSet.add(`${a.class.grade}-${a.subject.name}`);
      }
    });
    schoolPlans = schoolPlans.filter(p => allowedSet.has(`${p.grade}-${p.subjectName}`));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kế hoạch giáo dục nhà trường</h1>
        <p className="text-sm text-gray-500 mt-2">
          Khung kế hoạch giáo dục năm học {currentYear}. Dùng làm định mức để đối chiếu số tiết.
        </p>
      </div>

      <SchoolPlanClient initialData={schoolPlans} schoolYear={currentYear} supportedGrades={supportedGrades} isFullAccess={isFullAccess} />
    </div>
  );
}
