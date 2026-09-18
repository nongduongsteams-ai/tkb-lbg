const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const s = await prisma.subject.findMany({ where: { grade: 3 } });
  console.log(s.map(x => x.name));
}
main().finally(() => prisma.$disconnect());
