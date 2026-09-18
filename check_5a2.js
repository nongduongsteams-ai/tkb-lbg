const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.class.findFirst({ where: { name: '5A2' } });
  if (c) {
    const a = await prisma.assignment.findMany({ where: { classId: c.id }, include: { subject: true } });
    console.log('5A2:', a.map(x => x.subject.name + ' (Grade ' + x.subject.grade + ')'));
  }
}
main().finally(() => prisma.$disconnect());
