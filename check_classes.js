const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const classes = await prisma.class.findMany({ where: { schoolYear: '2026-2027' } });
  console.log(classes.map(c => c.name));
}
main().finally(() => prisma.$disconnect());
