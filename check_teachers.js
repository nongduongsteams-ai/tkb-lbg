const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({ select: { name: true } });
  console.log(teachers.map(t => t.name).sort());
}

main().finally(() => prisma.$disconnect());
