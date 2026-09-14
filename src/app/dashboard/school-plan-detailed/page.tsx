import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DetailedPlanClient from "./DetailedPlanClient";

export const metadata = {
  title: "Kế hoạch giáo dục chi tiết - TKB Pro",
};

export default async function DetailedSchoolPlanPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Check roles (only ADMIN, BGH)
  if (session.user.role !== "ADMIN" && session.user.role !== "BGH") {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-red-600">Truy cập bị từ chối</h2>
        <p className="mt-2 text-gray-600">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const currentYear = "2026-2027"; // TODO: Lấy từ cấu hình hệ thống
  
  // Fetch detailed plans
  const weeklyPlans = await prisma.weeklySchoolPlan.findMany({
    where: { schoolYear: currentYear },
    orderBy: [
      { grade: "asc" },
      { subjectName: "asc" }
    ]
  });

  // Fetch general plans (to compare totals)
  const generalPlans = await prisma.schoolPlan.findMany({
    where: { schoolYear: currentYear }
  });

  return (
    <div className="p-6">
      <DetailedPlanClient 
        initialWeeklyPlans={weeklyPlans} 
        generalPlans={generalPlans}
        schoolYear={currentYear}
      />
    </div>
  );
}
