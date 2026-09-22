import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as { name?: string | null; role: Role };

  const userId = (session.user as any).id;
  const isAdminOrBGH = user.role === 'ADMIN' || user.role === 'BGH';

  // Lấy dữ liệu tổng quan server-side
  const [
    userCount, 
    classCount, 
    subjectCount, 
    latestTimetable,
    planCount,
    assignmentCount,
    curriculumCount
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'GV' } }),
    prisma.class.count({ where: { schoolYear: "2026-2027" } }),
    prisma.subject.count(),
    prisma.timetableSlot.findFirst({
      orderBy: { weekNumber: 'desc' },
      select: { weekNumber: true }
    }),
    prisma.schoolPlan.count({ where: { schoolYear: "2026-2027" } }),
    prisma.assignment.count({ where: { schoolYear: "2026-2027" } }),
    prisma.curriculum.count()
  ]);

  const latestWeek = latestTimetable?.weekNumber || 0;

  let teacherClassCount = 0;
  let teacherSubjectCount = 0;
  let teacherPeriodCount = 0;

  if (!isAdminOrBGH && userId) {
    const assignments = await prisma.assignment.findMany({
      where: { schoolYear: "2026-2027", teacherId: userId },
      include: { class: true, subject: true }
    });
    const uniqueClasses = new Set(assignments.map(a => a.classId));
    teacherClassCount = uniqueClasses.size;
    const uniqueSubjects = new Set(assignments.map(a => a.subjectId));
    teacherSubjectCount = uniqueSubjects.size;

    if (latestWeek > 0) {
      teacherPeriodCount = await prisma.timetableSlot.count({
        where: {
          weekNumber: latestWeek,
          schoolYear: "2026-2027",
          assignment: { teacherId: userId }
        }
      });
    }
  }

  const stats = { 
    userCount, 
    classCount, 
    subjectCount,
    latestWeek,
    planCount,
    assignmentCount,
    curriculumCount,
    teacherClassCount,
    teacherSubjectCount,
    teacherPeriodCount
  };

  return <DashboardView user={user} stats={stats as any} />;
}
