const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const count = await prisma.curriculum.count(); 
  console.log('Total curriculum records:', count); 
  const sample = await prisma.curriculum.findMany({ take: 5 }); 
  console.log(sample); 
} 
main().finally(() => prisma.$disconnect());
