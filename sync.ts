import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncAll() {
  const schoolYear = '2026-2027';
  
  // Lấy tất cả assignment
  const assignments = await prisma.assignment.findMany({
    where: { schoolYear }
  });

  for (const assignment of assignments) {
    // 1. Lấy tất cả slots hợp lệ
    const allSlots = await prisma.timetableSlot.findMany({
      where: { assignmentId: assignment.id },
      include: { teachingSchedules: true }
    });

    const subSlots = allSlots.filter(s => s.status === 'SUBSTITUTE');
    const validSlots = allSlots.filter(normal => {
      if (normal.status !== 'NORMAL') return true;
      const isOverridden = subSlots.some(sub =>
        sub.weekNumber === normal.weekNumber &&
        sub.dayOfWeek === normal.dayOfWeek &&
        sub.session === normal.session &&
        sub.period === normal.period
      );
      return !isOverridden;
    });

    validSlots.sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
      return a.period - b.period;
    });

    let currentLessonNum = 1;
    for (const slot of validSlots) {
      if (slot.teachingSchedules.length > 0) {
        const ts = slot.teachingSchedules[0];
        
        const curriculum = await prisma.curriculum.findFirst({
          where: {
            subjectId: assignment.subjectId,
            grade: (await prisma.class.findUnique({ where: { id: assignment.classId } }))?.grade,
            lessonNumber: currentLessonNum,
          }
        });

        const lessonName = curriculum?.lessonName || 'Chưa có PPCT';

        await prisma.teachingSchedule.update({
          where: { id: ts.id },
          data: {
            actualLessonNum: currentLessonNum,
            actualLessonName: lessonName,
            curriculumId: curriculum?.id || null,
          }
        });
        currentLessonNum++;
      }
    }
  }
  console.log('Sync completed for all assignments');
}

syncAll().catch(console.error).finally(() => prisma.$disconnect());
