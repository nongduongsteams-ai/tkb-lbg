const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cls = await prisma.class.findFirst({ where: { name: '8C', schoolYear: '2026-2027' } });
  if (!cls) return console.log('Không tìm thấy lớp 8C');

  const assignments = await prisma.assignment.findMany({
    where: { classId: cls.id, subject: { name: { contains: 'Tin' } } },
    include: { subject: true, teacher: true }
  });
  console.log('Phân công Tin học 8C:', assignments.map(a => `${a.id} | Sub: ${a.subjectId} (${a.subject.name}) | GV: ${a.teacher.name}`));

  const slots = await prisma.timetableSlot.findMany({
    where: { assignmentId: { in: assignments.map(a => a.id) } },
    include: { teachingSchedules: true },
    orderBy: [{ weekNumber: 'asc' }, { dayOfWeek: 'asc' }, { period: 'asc' }]
  });
  console.log('Slots Tin học 8C:', slots.map(s => `W${s.weekNumber} T${s.dayOfWeek} P${s.period} -> PPCT: ${s.teachingSchedules[0]?.actualLessonNum} (${s.teachingSchedules[0]?.actualLessonName})`));
}
main().finally(() => prisma.$disconnect());
