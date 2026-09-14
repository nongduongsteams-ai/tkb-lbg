import { PrismaClient } from '@prisma/client';
import { syncAssignmentPPCT } from '../src/actions/timetable';

const prisma = new PrismaClient();

async function main() {
  console.log("Đang lấy danh sách tất cả các phân công chuyên môn...");
  const assignments = await prisma.assignment.findMany();
  
  console.log(`Đã tìm thấy ${assignments.length} phân công. Đang tiến hành đồng bộ...`);
  
  let i = 0;
  for (const a of assignments) {
    await syncAssignmentPPCT(a.id, a.schoolYear);
    i++;
    if (i % 10 === 0) {
      console.log(`Đã đồng bộ ${i}/${assignments.length}...`);
    }
  }
  
  console.log("Hoàn tất đồng bộ toàn bộ dữ liệu cũ!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
