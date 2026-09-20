import { getBranchTimetable, getDashboardStats } from '@/actions/timetable';
import { prisma } from '@/lib/prisma';
import TimetableClient from './TimetableClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { canEditTimetable } from '@/lib/session';
import { getEffectiveActions, canViewFullTimetable } from '@/lib/serverPermissions';

export default async function PrimaryBranchTimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const userRole = (session.user as { role?: string; permissions?: string[] }).role ?? 'GV';
  const currentUserId = (session.user as any).id;
  const effectiveActions = await getEffectiveActions(session);
  const isFullAccess = await canViewFullTimetable(session, effectiveActions);
  const readOnly = !(effectiveActions.has("ADMIN") || effectiveActions.has("MANAGE_TIMETABLE"));

  const resolvedParams = await searchParams;
  const schoolYear = '2026-2027';
  const branch = 'Phân hiệu TH';
  const level = 'PRIMARY';

  let weekNumber = 1;
  if (resolvedParams.week) {
    weekNumber = parseInt(resolvedParams.week);
  } else {
    // Find the latest week with data
    const [maxSlot, maxNote] = await Promise.all([
      prisma.timetableSlot.findFirst({
        where: { schoolYear, assignment: { class: { branch } } },
        orderBy: { weekNumber: 'desc' }
      }),
      prisma.timetableNote.findFirst({
        where: { schoolYear, branch },
        orderBy: { weekNumber: 'desc' }
      })
    ]);
    
    const maxSlotWeek = maxSlot?.weekNumber || 1;
    const maxNoteWeek = maxNote?.weekNumber || 1;
    weekNumber = Math.max(maxSlotWeek, maxNoteWeek);
  }
  
  // Chạy song song vì hai hàm hoàn toàn độc lập nhau
  const [{ classes, assignments, slots, timetableNotes, timetableCellNotes }, stats, schoolWeek] = await Promise.all([
    getBranchTimetable(weekNumber, schoolYear, branch, level),
    getDashboardStats(weekNumber, schoolYear, branch, level),
    prisma.schoolWeek.findUnique({
      where: { schoolYear_weekNumber: { schoolYear, weekNumber } }
    })
  ]);

  let filteredAssignments = assignments;
  let filteredClasses = classes;
  let filteredSlots = slots;

  let filteredStats = stats;

  if (!isFullAccess) {
    filteredAssignments = assignments.filter((a: any) => a.teacherId === currentUserId);
    const teacherAssignments = new Set(filteredAssignments.map((a: any) => `${a.class?.name || a.classId}_${a.subject?.name}`));
    
    // Grid (slots, classes) should NOT be filtered so everyone sees the full timetable
    filteredClasses = classes;
    filteredSlots = slots;
    
    // Stats (Control Panel) should ONLY show subjects assigned to the current teacher
    filteredStats = stats.map((classStat: any) => {
      return {
        ...classStat,
        subjects: classStat.subjects.filter((sub: any) => 
          teacherAssignments.has(`${classStat.className}_${sub.subjectName}`)
        )
      };
    }).filter((classStat: any) => classStat.subjects.length > 0);
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thời Khoá Biểu Phân Hiệu TH</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Xếp lịch tuần {weekNumber}
          </p>
        </div>
      </div>
      <TimetableClient 
        branch={branch}
        level={level}
        weekNumber={weekNumber} 
        schoolYear={schoolYear}
        schoolWeek={schoolWeek}
        classes={filteredClasses} 
        assignments={filteredAssignments} 
        slots={filteredSlots} 
        stats={filteredStats} 
        timetableNotes={timetableNotes}
        timetableCellNotes={timetableCellNotes}
        readOnly={readOnly}
        userRole={isFullAccess ? "ADMIN" : "GV"}
        currentUserId={currentUserId}
      />
    </div>
  );
}
