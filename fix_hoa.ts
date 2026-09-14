import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  // Find all "Hoá" and "Hóa"
  const allHoa = await prisma.weeklySchoolPlan.findMany({
    where: { subjectName: { contains: "Khoa học tự nhiên" } }
  });

  const toKeep = [];
  const toDelete = [];

  for (const row of allHoa) {
    if (row.subjectName.includes("Hoá") || row.subjectName.includes("Hóa")) {
      // If it has empty data mostly, we might consider deleting it if it's a duplicate
      // Actually, let's just delete the one we know the user created: 'cmtpcmyoz000012r2pv36xcs7'
      if (row.id === 'cmtpcmyoz000012r2pv36xcs7') {
        toDelete.push(row.id);
      }
    }
  }

  // Delete the conflicted one
  for (const id of toDelete) {
    await prisma.weeklySchoolPlan.delete({ where: { id } });
    console.log(`Deleted conflicted manual row ${id}`);
  }

  // Now rename all 'Hoá' to 'Hóa'
  const rowsWithHoa = await prisma.weeklySchoolPlan.findMany({
    where: { subjectName: { contains: 'Hoá' } }
  });

  for (const row of rowsWithHoa) {
    await prisma.weeklySchoolPlan.update({
      where: { id: row.id },
      data: { subjectName: row.subjectName.replace("Hoá", "Hóa") }
    });
    console.log(`Renamed row ${row.id} to ${row.subjectName.replace("Hoá", "Hóa")}`);
  }

  console.log("Done fixing Hóa spelling.");
}

run().catch(console.error).finally(() => prisma.$disconnect());
