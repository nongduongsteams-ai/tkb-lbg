import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LBGClient from "./LBGClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch Báo Giảng | TKB Pro",
};

export default async function LBGPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Lấy danh sách Tuần học, gộp theo năm học
  const schoolWeeks = await prisma.schoolWeek.findMany({
    orderBy: [
      { schoolYear: 'desc' },
      { weekNumber: 'asc' }
    ]
  });

  const uniqueYears = Array.from(new Set(schoolWeeks.map(w => w.schoolYear)));
  const defaultYear = uniqueYears[0] || "2024-2025"; // Lấy năm học mới nhất
  
  const currentYearWeeks = schoolWeeks.filter(w => w.schoolYear === defaultYear);

  // Lấy danh sách Giáo viên (kể cả những GV có phân công)
  const teachers = await prisma.user.findMany({
    where: { 
      // Chỉ lấy GV, hoặc admin/BGH cũng có thể có phân công
      // role: "GV" - ta lấy toàn bộ users để Admin cũng xem được nếu có
    },
    select: { id: true, name: true, shortName: true, role: true },
    orderBy: { name: 'asc' }
  });

  // Lọc chỉ những GV có assignment
  const usersWithAssignments = await prisma.assignment.findMany({
    where: { schoolYear: defaultYear },
    select: { teacherId: true },
    distinct: ['teacherId']
  });

  const teacherIdsWithAssignments = new Set(usersWithAssignments.map(a => a.teacherId));
  const relevantTeachers = teachers.filter(t => teacherIdsWithAssignments.has(t.id));

  const prepDayConfig = await prisma.systemConfig.findUnique({
    where: { key: "PREPARATION_DAY_OF_WEEK" }
  });
  const prepDay = prepDayConfig && prepDayConfig.value ? parseInt(prepDayConfig.value) : 5;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Lịch Báo Giảng</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Xem, tùy chỉnh và kết xuất Lịch báo giảng ra file Excel theo Mẫu chuẩn.</p>
      </div>

      <LBGClient 
        teachers={relevantTeachers} 
        schoolWeeks={currentYearWeeks} 
        schoolYear={defaultYear}
        currentUserRole={session.user.role as string}
        currentUserId={session.user.id}
        prepDay={prepDay}
      />
    </div>
  );
}
