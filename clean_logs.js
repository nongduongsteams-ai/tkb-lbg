const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  await prisma.lessonOverrideLog.deleteMany();
  await prisma.teachingSchedule.updateMany({
    where: { isManualOverride: true },
    data: { isManualOverride: false, isProgression: false, autoLessonNum: null }
  });
  console.log('Reset completed: Deleted all override logs and reset overrides in teaching schedules.');
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
