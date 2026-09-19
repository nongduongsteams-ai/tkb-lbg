import { getBranchTimetable } from '@/actions/timetable';
import { prisma } from '@/lib/prisma';
import DetailedClient from './DetailedClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DetailedTimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const userRole = (session.user as { role?: string; permissions?: string[] }).role ?? 'GV';
  const currentUserId = (session.user as any).id;

  const resolvedParams = await searchParams;
  const weekNumber = resolvedParams.week ? parseInt(resolvedParams.week) : 1;
  const schoolYear = '2026-2027'; 
  const branch = 'Phân hiệu';
  const level = 'SECONDARY';
  
  const [{ classes, assignments, slots, weeklyPlans, schoolPlans }, schoolWeek] = await Promise.all([
    getBranchTimetable(weekNumber, schoolYear, branch, level),
    prisma.schoolWeek.findUnique({
      where: { schoolYear_weekNumber: { schoolYear, weekNumber } }
    })
  ]);

  let filteredAssignments = assignments;
  let filteredClasses = classes;
  let filteredSlots = slots;

  if (userRole === 'GV') {
    filteredAssignments = assignments.filter(a => a.teacherId === currentUserId);
    const teacherClassIds = new Set(filteredAssignments.map(a => a.classId));
    filteredClasses = classes.filter(c => teacherClassIds.has(c.id));
    filteredSlots = slots.filter((s: any) => s.assignment?.teacherId === currentUserId);
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <DetailedClient
        weekNumber={weekNumber}
        schoolWeek={schoolWeek}
        classes={filteredClasses}
        assignments={filteredAssignments}
        slots={filteredSlots}
        weeklyPlans={weeklyPlans}
        schoolPlans={schoolPlans}
        userRole={userRole}
      />
    </div>
  );
}
