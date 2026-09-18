const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const classes = await prisma.class.findMany({ where: { grade: { lte: 5 } } });
  for (const c of classes) {
    const a = await prisma.assignment.deleteMany({
      where: {
        classId: c.id,
        subject: {
          name: {
            in: [
              'Khoa học tự nhiên (Hóa)',
              'Khoa học tự nhiên (Sinh)',
              'Khoa học tự nhiên (Lý)',
              'GDCD',
              'GDĐP',
              'Lịch sử và Địa lí (Địa)',
              'Lịch sử và Địa lí (Sử)'
            ]
          }
        }
      }
    });
    if (a.count > 0) {
      console.log(`Deleted ${a.count} THCS assignments for ${c.name}`);
    }
  }
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
