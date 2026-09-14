const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const teacher = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Vương', mode: 'insensitive' } },
        { shortName: { contains: 'Vương', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Tìm thấy Giáo viên có chữ Vương:", JSON.stringify(teacher, null, 2));

  const class6B = await prisma.class.findFirst({
    where: { name: '6B' }
  });
  console.log("Lớp 6B:", class6B);

  if (class6B) {
    const assignments = await prisma.assignment.findMany({
      where: { classId: class6B.id },
      include: {
        teacher: true,
        subject: true
      }
    });
    console.log("Danh sách phân công của lớp 6B:");
    assignments.forEach(a => {
      console.log(`- Môn: ${a.subject.name} | GV: ${a.teacher.name} (Short: ${a.teacher.shortName})`);
    });
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
