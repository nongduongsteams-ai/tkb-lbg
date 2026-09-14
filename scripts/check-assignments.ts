import { prisma } from '../src/lib/prisma';

async function main() {
  const classes = await prisma.class.findMany({
    where: { name: { in: ['4A', '4A2', '5A', '5A2'] } }
  });
  
  for (const c of classes) {
    console.log(`Class ${c.name} (Grade ${c.grade}):`);
    const assignments = await prisma.assignment.findMany({
      where: { classId: c.id },
      include: { subject: true, teacher: true }
    });
    for (const a of assignments) {
      if (a.subject.name.includes('Tin')) {
        console.log(`  - Assigned: ${a.subject.name} (Subject Grade: ${a.subject.grade}) by ${a.teacher.name}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
