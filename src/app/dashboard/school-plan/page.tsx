import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SchoolPlanClient from "./SchoolPlanClient";

import { getSupportedGrades } from "@/actions/config";

export default async function SchoolPlanPage() {
  const session = await getServerSession(authOptions);
  
  const currentYear = "2026-2027";
  const [schoolPlans, supportedGrades] = await Promise.all([
    prisma.schoolPlan.findMany({
      where: { schoolYear: currentYear },
      orderBy: [
        { grade: 'asc' },
        { subjectName: 'asc' }
      ]
    }),
    getSupportedGrades()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Kế hoạch giáo dục nhà trường</h1>
        <p className="text-sm text-gray-500 mt-2">
          Khung kế hoạch giáo dục năm học {currentYear}. Dùng làm định mức để đối chiếu số tiết.
        </p>
      </div>

      <SchoolPlanClient initialData={schoolPlans} schoolYear={currentYear} supportedGrades={supportedGrades} />
    </div>
  );
}
