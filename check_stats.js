const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolYear = '2026-2027';
  const branch = 'Trường chính';
  const level = 'PRIMARY';
  const weekNumber = 1;

  const classes = await prisma.class.findMany({ 
    where: { schoolYear, branch, grade: { lte: 5 } },
    orderBy: { name: 'asc' }
  });
  const classIds = classes.map(c => c.id);

  const allAssignments = await prisma.assignment.findMany({
    where: { schoolYear, classId: { in: classIds } },
    include: { subject: true }
  });

  const stats = [];
  
  for (const cls of classes) {
    const assignments = allAssignments.filter(a => a.classId === cls.id && ((cls.grade <= 5 && a.subject.grade <= 5) || (cls.grade >= 6 && a.subject.grade >= 6)));
    
    const subjectsList = assignments.map((a) => {
        return {
          subjectId: a.subject.id,
          subjectName: a.subject.name,
        };
    });
    
    stats.push({
      className: cls.name,
      subjects: subjectsList
    });
  }
  
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
