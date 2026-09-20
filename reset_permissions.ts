import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.deleteMany({
    where: { key: 'ROLE_PERMISSIONS' }
  });
  console.log('Deleted ROLE_PERMISSIONS from SystemConfig to force fallback to DEFAULT_ROLE_PERMISSIONS.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
