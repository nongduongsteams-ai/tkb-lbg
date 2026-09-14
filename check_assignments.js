const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const classes = await prisma.class.findMany({ where: { schoolYear: '2026-2027', branch: 'Trường chính', grade: { lte: 5 } } });
  const classIds = classes.map(c => c.id);
  const assignments = await prisma.assignment.findMany({ where: { schoolYear: '2026-2027', classId: { in: classIds } } });
  console.log('Classes:', classes.length, 'Assignments:', assignments.length);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
