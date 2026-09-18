import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import DashboardView from "./DashboardView";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as { name?: string | null; role: Role };

  // Lấy dữ liệu tổng quan server-side
  const [userCount, classCount, subjectCount, latestTimetable] = await Promise.all([
    prisma.user.count(),
    prisma.class.count({ where: { schoolYear: "2026-2027" } }),
    prisma.subject.count(),
    prisma.timetableSlot.findFirst({
      orderBy: { weekNumber: 'desc' },
      select: { weekNumber: true }
    })
  ]);

  const stats = { 
    userCount, 
    classCount, 
    subjectCount,
    latestWeek: latestTimetable?.weekNumber || 0
  };

  return <DashboardView user={user} stats={stats} />;
}
