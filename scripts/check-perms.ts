import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log("Configs:");
  console.dir(configs, { depth: null });

  const users = await prisma.user.findMany({
    where: { role: 'GV' }
  });
  console.log("Users GV:");
  console.log(users.map(u => ({ name: u.name, permissions: u.permissions })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
