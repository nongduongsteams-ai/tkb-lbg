const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const c3 = await prisma.curriculum.findMany({ where: { subjectId: 'cmtzof8sv0003axhzt49tykfy' } }); 
  const c4 = await prisma.curriculum.findMany({ where: { subjectId: 'cmtzof8zk0004axhztz6mj0m2' } }); 
  console.log('Grade 3 subject curriculum count:', c3.length); 
  console.log('Grade 4 subject curriculum count:', c4.length); 
} 
main().finally(() => prisma.$disconnect());
