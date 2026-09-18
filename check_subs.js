const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const subjects = await prisma.subject.findMany();
  console.log(subjects.map(s => s.name + ' - Grade: ' + s.grade));
}
main().finally(() => prisma.$disconnect());
