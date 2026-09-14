const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  console.log('SUBJECTS:', await prisma.subject.findMany({ select: { name: true, grade: true } })); 
  console.log('PLANS:', await prisma.schoolPlan.findMany({ select: { subjectName: true, grade: true, totalYear: true } })); 
} 

main().catch(console.error).finally(() => prisma.$disconnect());
