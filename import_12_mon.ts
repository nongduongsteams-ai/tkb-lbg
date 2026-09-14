import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const schoolYear = "2026-2027";
  
  // Clear existing
  await prisma.schoolPlan.deleteMany({
    where: { schoolYear }
  });

  const subjectsData = [
    { name: "Ngữ văn", data: [72, 68, 140, 72, 68, 140, 72, 68, 140, 72, 68, 140] },
    { name: "Toán", data: [72, 68, 140, 72, 68, 140, 72, 68, 140, 72, 68, 140] },
    { name: "Ngoại ngữ 1", data: [54, 51, 105, 54, 51, 105, 54, 51, 105, 54, 51, 105] },
    { name: "GDCD", data: [18, 17, 35, 18, 17, 35, 18, 17, 35, 18, 17, 35] },
    { name: "LS và ĐL", data: [54, 51, 105, 54, 51, 105, 54, 51, 105, 54, 51, 105] },
    { name: "KHTN", data: [72, 68, 140, 72, 68, 140, 72, 68, 140, 72, 68, 140] },
    { name: "Công nghệ", data: [18, 17, 35, 18, 17, 35, 18, 34, 52, 35, 17, 52] },
    { name: "Tin học", data: [18, 17, 35, 18, 17, 35, 18, 17, 35, 18, 17, 35] },
    { name: "GDTC", data: [36, 34, 70, 36, 34, 70, 36, 34, 70, 36, 34, 70] },
    { name: "Nghệ thuật", data: [36, 34, 70, 36, 34, 70, 36, 34, 70, 36, 34, 70] },
    { name: "HĐTNHN", data: [54, 51, 105, 54, 51, 105, 54, 51, 105, 54, 51, 105] },
    { name: "GDĐP", data: [18, 17, 35, 18, 17, 35, 18, 17, 35, 18, 17, 35] }
  ];

  for (const sub of subjectsData) {
    const d = sub.data;
    
    const grades = [
      { grade: 6, hk1: d[0], hk2: d[1], cn: d[2] },
      { grade: 7, hk1: d[3], hk2: d[4], cn: d[5] },
      { grade: 8, hk1: d[6], hk2: d[7], cn: d[8] },
      { grade: 9, hk1: d[9], hk2: d[10], cn: d[11] },
    ];

    for (const g of grades) {
      await prisma.schoolPlan.create({
        data: {
          schoolYear,
          grade: g.grade,
          subjectName: sub.name,
          totalHk1: g.hk1,
          totalHk2: g.hk2,
          totalYear: g.cn,
          periodsPerWeekHk1: Math.round((g.hk1 / 18) * 10) / 10,
          periodsPerWeekHk2: Math.round((g.hk2 / 17) * 10) / 10,
        }
      });
    }
  }
  console.log("Successfully imported 12 subjects!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
