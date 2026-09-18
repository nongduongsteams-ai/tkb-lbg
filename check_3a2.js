const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.class.findFirst({ where: { name: '3A2' } });
  if (c) {
    const a = await prisma.assignment.findMany({ where: { classId: c.id }, include: { subject: true, teacher: true } });
    console.log('3A2 Assignments:', a.map(x => x.subject.name + ' - ' + x.teacher.name));
  }
}
main().finally(() => prisma.$disconnect());
