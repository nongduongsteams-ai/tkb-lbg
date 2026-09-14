const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { name: true, shortName: true } });
  console.log(users.map(u => u.name).sort());
}

main().finally(() => prisma.$disconnect());
