const fs = require('fs');
let code = fs.readFileSync('src/actions/timetable.ts', 'utf8');

// 1. getBranchTimetable
code = code.replace(
  /export async function getBranchTimetable\([^)]+\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{[\s\S]*?where: \{ schoolYear, branch \},[\s\S]*?orderBy: \{ name: 'asc' \}\s*\}\);/,
  `export async function getBranchTimetable(weekNumber: number, schoolYear: string, branch: string = "Phân hiệu", level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL') {
  // Bước 1: Lấy danh sách lớp (cần trước để lấy classIds)
  const classes = await prisma.class.findMany({
    where: { 
      schoolYear, 
      branch,
      ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
      ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
    },
    select: { id: true, name: true, grade: true },
    orderBy: { name: 'asc' }
  });`
);

// 2. getDashboardStats
code = code.replace(
  /export async function getDashboardStats\([^)]+\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{ \s*where: \{ schoolYear, branch \},\s*orderBy: \{ name: 'asc' \}\s*\}\);/,
  `export async function getDashboardStats(weekNumber: number, schoolYear: string, branch: string = "Phân hiệu", level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL') {
  // Return stats for sidebar
  const classes = await prisma.class.findMany({ 
    where: { 
      schoolYear, 
      branch,
      ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
      ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
    },
    orderBy: { name: 'asc' }
  });`
);

// 3. rolloverWeek
code = code.replace(
  /export async function rolloverWeek\([^)]+\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{ \s*where: \{ schoolYear, branch \},\s*orderBy: \{ name: 'asc' \}\s*\}\);/,
  `export async function rolloverWeek(fromWeek: number, toWeek: number, schoolYear: string, branch: string = "Phân hiệu", level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL') {
  try {
    // Lấy các lớp của phân hiệu
    const classes = await prisma.class.findMany({ 
      where: { 
        schoolYear, 
        branch,
        ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
        ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
      },
      orderBy: { name: 'asc' }
    });`
);

// 4. getOverrideLogs
code = code.replace(
  /export async function getOverrideLogs\([^)]+\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{[\s\S]*?where: \{ schoolYear, branch \},\s*select: \{ name: true \}\s*\}\);/,
  `export async function getOverrideLogs(weekNumber: number, schoolYear: string, branch: string = 'Phân hiệu', level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL') {
  try {
    // Lấy classIds của phân hiệu
    const classes = await prisma.class.findMany({
      where: { 
        schoolYear, 
        branch,
        ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
        ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
      },
      select: { name: true }
    });`
);

// 5. bulkDeleteSlots
code = code.replace(
  /export async function bulkDeleteSlots\([\s\S]*?status: 'NORMAL' \| 'SUBSTITUTE' \| 'ALL' = 'ALL'\n\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{[\s\S]*?where: \{ schoolYear, branch \},\s*select: \{ id: true \}\s*\}\);/,
  `export async function bulkDeleteSlots(
  mode: BulkDeleteMode,
  weekNumber: number,
  schoolYear: string,
  branch: string = 'Phân hiệu',
  filterId?: string,
  status: 'NORMAL' | 'SUBSTITUTE' | 'ALL' = 'ALL',
  level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL'
) {
  try {
    // Lấy danh sách lớp của phân hiệu
    const classes = await prisma.class.findMany({
      where: { 
        schoolYear, 
        branch,
        ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
        ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
      },
      select: { id: true }
    });`
);

// 6. importTimetableFromJSON
code = code.replace(
  /export async function importTimetableFromJSON\([\s\S]*?branch: string = "Phân hiệu"\n\) \{[\s\S]*?const classes = await prisma\.class\.findMany\(\{[\s\S]*?where: \{ schoolYear, branch \}\s*\}\);/,
  `export async function importTimetableFromJSON(
  jsonData: any[],
  weekNumber: number,
  schoolYear: string,
  branch: string = "Phân hiệu",
  level: 'ALL' | 'PRIMARY' | 'SECONDARY' = 'ALL'
) {
  try {
    const results = {
      successCount: 0,
      skipCount: 0,
      skippedItems: [] as { item: any, reason: string }[],
    };

    // 1. Lấy tất cả lớp của chi nhánh
    const classes = await prisma.class.findMany({
      where: { 
        schoolYear, 
        branch,
        ...(level === 'PRIMARY' ? { grade: { lte: 5 } } : {}),
        ...(level === 'SECONDARY' ? { grade: { gte: 6 } } : {})
      }
    });`
);

fs.writeFileSync('src/actions/timetable.ts', code);
console.log('patched');
