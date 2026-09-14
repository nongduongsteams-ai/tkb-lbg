const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const oldYear = '2025-2026'; 
  const newYear = '2026-2027'; 
  await prisma.class.updateMany({ where: { schoolYear: oldYear }, data: { schoolYear: newYear } }); 
  await prisma.schoolPlan.updateMany({ where: { schoolYear: oldYear }, data: { schoolYear: newYear } }); 
  await prisma.assignment.updateMany({ where: { schoolYear: oldYear }, data: { schoolYear: newYear } }); 
  console.log('Updated DB successfully'); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
