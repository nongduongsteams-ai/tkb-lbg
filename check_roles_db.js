const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.systemConfig.findUnique({where: {key: 'ROLE_PERMISSIONS'}})
  .then(c => console.log(c?.value))
  .finally(() => p.$disconnect());
