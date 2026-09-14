import { getBranchTimetable } from '@/actions/timetable';
import { prisma } from '@/lib/prisma';
import DetailedClient from './DetailedClient';

export default async function DetailedTimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const resolvedParams = await searchParams;
  const weekNumber = resolvedParams.week ? parseInt(resolvedParams.week) : 1;
  const schoolYear = '2026-2027'; 
  
  const [{ classes, assignments, slots, weeklyPlans, schoolPlans }, schoolWeek] = await Promise.all([
    getBranchTimetable(weekNumber, schoolYear, "Phân hiệu"),
    prisma.schoolWeek.findUnique({
      where: { schoolYear_weekNumber: { schoolYear, weekNumber } }
    })
  ]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <DetailedClient
        weekNumber={weekNumber}
        schoolWeek={schoolWeek}
        classes={classes}
        assignments={assignments}
        slots={slots}
        weeklyPlans={weeklyPlans}
        schoolPlans={schoolPlans}
      />
    </div>
  );
}
