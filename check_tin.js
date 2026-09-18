const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const subject = await prisma.subject.findFirst({ where: { name: { contains: 'Tin' } } }); 
  if (!subject) return console.log('No subject found'); 
  const c3 = await prisma.curriculum.findMany({ where: { subjectId: subject.id, grade: 3 } }); 
  const c4 = await prisma.curriculum.findMany({ where: { subjectId: subject.id, grade: 4 } }); 
  console.log('Tin hoc ID:', subject.id); 
  console.log('Grade 3 count:', c3.length); 
  console.log('Grade 4 count:', c4.length); 
} 
main().finally(() => prisma.$disconnect());
