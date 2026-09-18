const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const classes = await prisma.class.findMany({ where: { grade: { lte: 5 } } });
  for (const c of classes) {
    const a = await prisma.assignment.deleteMany({
      where: {
        classId: c.id,
        subject: { grade: { gte: 6 } }
      }
    });
    if (a.count > 0) {
      console.log(`Deleted ${a.count} Grade 6+ assignments for ${c.name}`);
    }
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
