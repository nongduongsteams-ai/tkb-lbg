import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const data = await prisma.weeklySchoolPlan.findMany({
    where: { subjectName: "HĐTN, HN (CC+SH)" }
  });

  console.log(`Found ${data.length} rows to split.`);

  for (const row of data) {
    const weeklyData = row.weeklyData as string[];
    // create weeklyData with "1" instead of "2"
    const newWeeklyData = weeklyData.map(val => val === "2" ? "1" : val);

    // Create Chào cờ
    await prisma.weeklySchoolPlan.create({
      data: {
        schoolYear: row.schoolYear,
        grade: row.grade,
        subjectName: "HĐTN, HN (Chào cờ)",
        semester: row.semester,
        weeklyData: newWeeklyData
      }
    });

    // Create Sinh hoạt
    await prisma.weeklySchoolPlan.create({
      data: {
        schoolYear: row.schoolYear,
        grade: row.grade,
        subjectName: "HĐTN, HN (Sinh hoạt lớp)",
        semester: row.semester,
        weeklyData: newWeeklyData
      }
    });

    // Delete old
    await prisma.weeklySchoolPlan.delete({
      where: { id: row.id }
    });
  }

  console.log("Done splitting HĐTN, HN (CC+SH) into Chào cờ and Sinh hoạt lớp.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
