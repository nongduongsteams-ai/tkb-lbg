const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      assignment: {
        class: { name: '6C' },
        subject: { name: 'Ngoại ngữ 1' }
      }
    },
    include: {
      assignment: {
        include: { teacher: true, subject: true }
      }
    }
  });

  console.log('Total slots for 6C Ngoại ngữ 1: ' + slots.length);
  slots.forEach(s => {
       console.log(`- Week: ${s.weekNumber}, Day: ${s.dayOfWeek}, Period: ${s.period}, Session: ${s.session}, Status: ${s.status}, Teacher: ${s.assignment.teacher.name}`);
  });
}

main().finally(() => prisma.$disconnect());
