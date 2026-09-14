const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Lấy toàn bộ DB
  const allSubjects = await prisma.subject.findMany();
  const allClasses = await prisma.class.findMany({ where: { schoolYear: '2026-2027' } });
  const allUsers = await prisma.user.findMany();

  console.log("=== CÁC MÔN HỌC TRONG DB ===");
  const subjectNames = [...new Set(allSubjects.map(s => s.name))].sort();
  console.log(subjectNames);

  console.log("\n=== CÁC LỚP TRONG DB (2026-2027) ===");
  const classNames = allClasses.map(c => c.name).sort();
  console.log(classNames);

  console.log("\n=== GIÁO VIÊN TRONG DB (tên) ===");
  const teacherNames = allUsers.map(u => u.name).sort();
  console.log(teacherNames);
}

main().finally(() => prisma.$disconnect());
