const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Vì Subject có unique constraint (name, grade),
  // cần xóa bản ghi "Lý" thừa TRƯỚC rồi mới đổi "Lí" -> "Lý"
  
  console.log('=== Bước 1: Khôi phục Lịch sử và Địa lý về tên cũ đúng ===');
  const r1 = await prisma.subject.updateMany({
    where: { name: 'Lịch sử và Địa lí (Sử)' },
    data: { name: 'Lịch sử và Địa lí (Lịch sử )' }
  });
  console.log(`Khôi phục Sử -> Lịch sử: ${r1.count}`);

  const r2 = await prisma.subject.updateMany({
    where: { name: 'Lịch sử và Địa lí (Địa)' },
    data: { name: 'Lịch sử và Địa lí (Địa lý )' }
  });
  console.log(`Khôi phục Địa -> Địa lý: ${r2.count}`);

  console.log('\n=== Bước 2: Tìm và xóa bản ghi Subject (Lý) thừa ===');
  const subjectsLy = await prisma.subject.findMany({ where: { name: 'Khoa học tự nhiên (Lý)' } });
  for (const s of subjectsLy) {
    // Chuyển assignment từ Lý sang Lí (nếu có)
    const subjectLi = await prisma.subject.findFirst({ where: { name: 'Khoa học tự nhiên (Lí)', grade: s.grade } });
    if (subjectLi) {
      const moveCount = await prisma.assignment.updateMany({
        where: { subjectId: s.id },
        data: { subjectId: subjectLi.id }
      });
      console.log(`  Chuyển ${moveCount.count} assignment từ Lý -> Lí khối ${s.grade}`);
    }
    await prisma.subject.delete({ where: { id: s.id } });
    console.log(`  Đã xóa Subject Lý khối ${s.grade}`);
  }

  console.log('\n=== Bước 3: Đổi tên ĐỒNG BỘ cả Subject + WeeklySchoolPlan ===');
  // 3a. Lí -> Lý
  const r3 = await prisma.subject.updateMany({ where: { name: 'Khoa học tự nhiên (Lí)' }, data: { name: 'Khoa học tự nhiên (Lý)' } });
  const r4 = await prisma.weeklySchoolPlan.updateMany({ where: { subjectName: 'Khoa học tự nhiên (Lí)' }, data: { subjectName: 'Khoa học tự nhiên (Lý)' } });
  console.log(`Lí -> Lý: Subject=${r3.count}, Plan=${r4.count}`);

  // 3b. Lịch sử -> Sử
  const r5 = await prisma.subject.updateMany({ where: { name: 'Lịch sử và Địa lí (Lịch sử )' }, data: { name: 'Lịch sử và Địa lí (Sử)' } });
  const r6 = await prisma.weeklySchoolPlan.updateMany({ where: { subjectName: 'Lịch sử và Địa lí (Lịch sử )' }, data: { subjectName: 'Lịch sử và Địa lí (Sử)' } });
  console.log(`Lịch sử -> Sử: Subject=${r5.count}, Plan=${r6.count}`);

  // 3c. Địa lý -> Địa
  const r7 = await prisma.subject.updateMany({ where: { name: 'Lịch sử và Địa lí (Địa lý )' }, data: { name: 'Lịch sử và Địa lí (Địa)' } });
  const r8 = await prisma.weeklySchoolPlan.updateMany({ where: { subjectName: 'Lịch sử và Địa lí (Địa lý )' }, data: { subjectName: 'Lịch sử và Địa lí (Địa)' } });
  console.log(`Địa lý -> Địa: Subject=${r7.count}, Plan=${r8.count}`);

  // Kiểm tra cuối
  const finalSubjects = [...new Set((await prisma.subject.findMany()).map(s => s.name))].sort();
  const finalPlans = [...new Set((await prisma.weeklySchoolPlan.findMany()).map(p => p.subjectName))].sort();
  
  console.log('\n=== KẾT QUẢ ===');
  console.log('Subject:', finalSubjects);
  console.log('\nWeeklySchoolPlan:', finalPlans);
  
  const mismatches = finalSubjects.filter(n => !finalPlans.includes(n));
  const mismatches2 = finalPlans.filter(n => !finalSubjects.includes(n));
  if (mismatches.length === 0 && mismatches2.length === 0) {
    console.log('\n✅ Đã đồng bộ hoàn toàn!');
  } else {
    if (mismatches.length > 0) console.log('\n❌ Subject thừa:', mismatches);
    if (mismatches2.length > 0) console.log('\n❌ Plan thừa:', mismatches2);
  }
}

main().finally(() => prisma.$disconnect());
