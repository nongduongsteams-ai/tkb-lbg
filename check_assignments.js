const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const a = await prisma.assignment.findMany({ where: { class: { grade: { lte: 5 } } }, include: { subject: true, class: true } });
  const byClass = {};
  a.forEach(x => {
    if (!byClass[x.class.name]) byClass[x.class.name] = [];
    byClass[x.class.name].push(x.subject.name + ' (Grade ' + x.subject.grade + ')');
  });
  console.log(byClass);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
