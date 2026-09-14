const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const plans = await prisma.weeklySchoolPlan.findMany({ select: { subjectName: true, grade: true } }); 
  console.log('WEEKLY PLANS:', plans.slice(0, 50)); 
} 

main().catch(console.error).finally(() => prisma.$disconnect());
