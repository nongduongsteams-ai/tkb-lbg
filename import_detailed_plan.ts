import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

const HK1_FILE = "../Kế hoạch nhà trường chi tiết học kỳ 1.md";
const HK2_FILE = "../Kế hoạch nhà trường chi tiết học kỳ 2.md";

const SCHOOL_YEAR = "2026-2027";
const GRADES = [6, 7, 8, 9];

function parseTable(content: string, expectedWeeks: number) {
  const lines = content.split('\n').filter(line => line.trim().startsWith('|'));
  // Remove header and separator
  const dataLines = lines.slice(2);
  
  const results: any[] = [];
  
  for (const line of dataLines) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < expectedWeeks + 3) continue; // Need enough columns
    
    const subjectNameRaw = parts[1];
    if (subjectNameRaw.includes("Tổng số tiết")) continue;

    // extract weeks
    const weeksData = parts.slice(2, 2 + expectedWeeks).map(v => v || "");
    
    results.push({
      subjectNameRaw,
      weeksData
    });
  }
  return results;
}

function assignGrades(subjectNameRaw: string) {
  // If subject name has numbers, extract them
  const match = subjectNameRaw.match(/[6789]/g);
  let gradesToAssign = GRADES;
  let cleanName = subjectNameRaw;

  if (match && match.length > 0) {
    gradesToAssign = Array.from(new Set(match.map(Number)));
    // Clean name: e.g. "Khoa học tự nhiên 6 (Lí)" -> "Khoa học tự nhiên (Lí)"
    // Wait, the client UI just shows "Khoa học tự nhiên (Lí)".
    // Let's keep it as is, or strip the grade from the display name to avoid "Khoa học tự nhiên 6 (Lí)" on grade 6 row.
    cleanName = subjectNameRaw.replace(/[6789]/g, "").replace(/,\s*/g, "").replace(/\s+/g, " ").trim();
  }

  return { gradesToAssign, cleanName };
}

async function run() {
  const hk1Content = fs.readFileSync(HK1_FILE, "utf-8");
  const hk2Content = fs.readFileSync(HK2_FILE, "utf-8");

  const hk1Parsed = parseTable(hk1Content, 18);
  const hk2Parsed = parseTable(hk2Content, 17);

  // Clear existing
  await prisma.weeklySchoolPlan.deleteMany({
    where: { schoolYear: SCHOOL_YEAR }
  });

  console.log("Deleted old detailed plans");

  // Insert HK1
  let count = 0;
  for (const row of hk1Parsed) {
    const { gradesToAssign, cleanName } = assignGrades(row.subjectNameRaw);
    for (const grade of gradesToAssign) {
      await prisma.weeklySchoolPlan.create({
        data: {
          schoolYear: SCHOOL_YEAR,
          grade: grade,
          subjectName: cleanName,
          semester: 1,
          weeklyData: row.weeksData
        }
      });
      count++;
    }
  }
  console.log(`Inserted ${count} rows for HK1`);

  // Insert HK2
  count = 0;
  for (const row of hk2Parsed) {
    const { gradesToAssign, cleanName } = assignGrades(row.subjectNameRaw);
    for (const grade of gradesToAssign) {
      await prisma.weeklySchoolPlan.create({
        data: {
          schoolYear: SCHOOL_YEAR,
          grade: grade,
          subjectName: cleanName,
          semester: 2,
          weeklyData: row.weeksData
        }
      });
      count++;
    }
  }
  console.log(`Inserted ${count} rows for HK2`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
