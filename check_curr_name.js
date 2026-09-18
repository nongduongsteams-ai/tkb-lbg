const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const curriculums = await prisma.curriculum.findMany({
    where: {
      subject: { name: 'Tin học' },
      grade: 4
    }
  });
  console.log('Tin hoc grade 4 PPCT count via name:', curriculums.length);
} 
main().finally(() => prisma.$disconnect());
