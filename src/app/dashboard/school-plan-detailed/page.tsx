import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DetailedPlanClient from "./DetailedPlanClient";
import { getDetailedSchoolPlans } from "@/actions/detailedSchoolPlan";
import { getSchoolPlans } from "@/actions/schoolPlan";
import { getRolePermissions } from "@/actions/config";
import { getEffectiveActions, canViewFullTimetable } from "@/lib/serverPermissions";
export const metadata = {
  title: "Kế hoạch giáo dục chi tiết - TKB Pro",
};

export default async function DetailedSchoolPlanPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Allow GV, BGH, ADMIN
  if (!["ADMIN", "BGH", "GV"].includes(session.user.role)) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-red-600">Truy cập bị từ chối</h2>
        <p className="mt-2 text-gray-600">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const currentYear = "2026-2027"; // TODO: Lấy từ cấu hình hệ thống
  
  const userId = (session.user as any).id as string;
  const effectiveActions = await getEffectiveActions(session);

  const isFullAccessSet = effectiveActions.has("ADMIN");
  let isFullAccess = isFullAccessSet;
  if (!isFullAccess && effectiveActions.has("MANAGE_SCHOOL_PLAN")) {
    const role = (session.user as any).role as string;
    const permissions = (session.user as any).permissions as string[] || [];
    const fullAccessRoles = ['BGH', 'BGH HT', 'BGH PHT', 'Tổ trưởng', 'Tổ phó'];
    if (fullAccessRoles.some(r => role.includes(r)) || permissions.some(p => fullAccessRoles.some(r => p.includes(r)))) {
      isFullAccess = true;
    }
  }

  // Fetch detailed plans
  const detailedRes = await getDetailedSchoolPlans(currentYear, userId, isFullAccess);
  let weeklyPlans = detailedRes.success && detailedRes.data ? detailedRes.data : [];

  // Fetch general plans (to compare totals)
  const generalRes = await getSchoolPlans(currentYear, userId, isFullAccess);
  let generalPlans = generalRes.success && generalRes.data ? generalRes.data : [];

  if (!isFullAccess && session.user.role === "GV") {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: (session.user as any).id, schoolYear: currentYear },
      include: {
        class: true,
        subject: true
      }
    });

    const allowedSet = new Set<string>();
    assignments.forEach(a => {
      if (a.class && a.subject) {
        allowedSet.add(`${a.class.grade}-${a.subject.name}`);
      }
    });

    weeklyPlans = weeklyPlans.filter(p => allowedSet.has(`${p.grade}-${p.subjectName}`));
    generalPlans = generalPlans.filter(p => allowedSet.has(`${p.grade}-${p.subjectName}`));
  }

  return (
    <div className="p-6">
      <DetailedPlanClient 
        initialWeeklyPlans={weeklyPlans} 
        generalPlans={generalPlans}
        schoolYear={currentYear}
        userRole={session.user.role}
        isFullAccess={isFullAccess}
      />
    </div>
  );
}
