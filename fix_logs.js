const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const logs = await prisma.lessonOverrideLog.findMany({
    where: { isReverted: false },
    include: { schedule: true }
  });
  let count = 0;
  for (const log of logs) {
    if (!log.schedule.isManualOverride) {
      await prisma.lessonOverrideLog.update({
        where: { id: log.id },
        data: { isReverted: true }
      });
      count++;
    }
  }
  console.log('Fixed ' + count + ' ghost logs.');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
