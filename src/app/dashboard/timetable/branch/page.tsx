import { getBranchTimetable, getDashboardStats } from '@/actions/timetable';
import { prisma } from '@/lib/prisma';
import TimetableClient from './TimetableClient';

export default async function BranchTimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const resolvedParams = await searchParams;
  const schoolYear = '2026-2027'; // Should be dynamic in real app
  const branch = 'Phân hiệu';
  const level = 'ALL';

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
  const [{ classes, assignments, slots, timetableNotes }, stats, schoolWeek] = await Promise.all([
    getBranchTimetable(weekNumber, schoolYear, branch, level),
    getDashboardStats(weekNumber, schoolYear, branch, level),
    prisma.schoolWeek.findUnique({
      where: { schoolYear_weekNumber: { schoolYear, weekNumber } }
    })
  ]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thời Khoá Biểu THCS - Phân Hiệu</h1>
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
        classes={classes} 
        assignments={assignments} 
        slots={slots} 
        stats={stats} 
        timetableNotes={timetableNotes}
      />
    </div>
  );
}
