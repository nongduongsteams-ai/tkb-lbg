const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolYear = '2026-2027';
  const branch = 'Trường chính';

  const classes = await prisma.class.findMany({ 
    where: { schoolYear, branch, grade: { lte: 5 } },
    orderBy: { name: 'asc' }
  });
  const classIds = classes.map(c => c.id);

  const allAssignments = await prisma.assignment.findMany({
    where: { schoolYear, classId: { in: classIds } },
    include: { subject: true }
  });

  const subjects = new Set();
  allAssignments.forEach(a => {
    subjects.add(`Name: ${a.subject.name}, Grade: ${a.subject.grade}`);
  });
  console.log(Array.from(subjects));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
