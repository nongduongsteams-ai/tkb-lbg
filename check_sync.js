const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Kiểm tra tên môn trong WeeklySchoolPlan
  const plans = await prisma.weeklySchoolPlan.findMany({ orderBy: { subjectName: 'asc' } });
  const subjectNames = [...new Set(plans.map(p => p.subjectName))].sort();
  console.log('=== Tên môn trong WeeklySchoolPlan ===');
  console.log(subjectNames);

  // Kiểm tra tên môn trong Subject
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  const subjectNamesInDB = [...new Set(subjects.map(s => s.name))].sort();
  console.log('\n=== Tên môn trong Subject table ===');
  console.log(subjectNamesInDB);
  
  // Kiểm tra xem có môn nào trong Subject KHÔNG có trong WeeklySchoolPlan không
  console.log('\n=== Môn trong Subject KHÔNG có trong WeeklySchoolPlan ===');
  const inSubjectNotPlan = subjectNamesInDB.filter(n => !subjectNames.includes(n));
  console.log(inSubjectNotPlan);
  
  // Kiểm tra ngược lại
  console.log('\n=== Môn trong WeeklySchoolPlan KHÔNG có trong Subject ===');
  const inPlanNotSubject = subjectNames.filter(n => !subjectNamesInDB.includes(n));
  console.log(inPlanNotSubject);
}

main().finally(() => prisma.$disconnect());
