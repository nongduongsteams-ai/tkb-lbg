const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Đổi "Khoa học tự nhiên (Lí)" -> "Khoa học tự nhiên (Lý)"
  const r1 = await prisma.subject.updateMany({
    where: { name: 'Khoa học tự nhiên (Lí)' },
    data: { name: 'Khoa học tự nhiên (Lý)' }
  });
  console.log(`Đổi KHTN Lí -> Lý: ${r1.count} bản ghi`);

  // 2. Đổi "Lịch sử và Địa lí (Lịch sử )" -> "Lịch sử và Địa lí (Sử)"
  const r2 = await prisma.subject.updateMany({
    where: { name: { contains: 'Lịch sử và Địa lí (Lịch sử' } },
    data: { name: 'Lịch sử và Địa lí (Sử)' }
  });
  console.log(`Đổi LS -> Sử: ${r2.count} bản ghi`);

  // 3. Đổi "Lịch sử và Địa lí (Địa lý )" -> "Lịch sử và Địa lí (Địa)"
  const r3 = await prisma.subject.updateMany({
    where: { name: { contains: 'Lịch sử và Địa lí (Địa' } },
    data: { name: 'Lịch sử và Địa lí (Địa)' }
  });
  console.log(`Đổi Địa lý -> Địa: ${r3.count} bản ghi`);

  // Kiểm tra kết quả
  const all = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  console.log('\nDanh sách môn sau khi đổi tên:');
  const names = [...new Set(all.map(s => s.name))].sort();
  console.log(names);
}

main().finally(() => prisma.$disconnect());
