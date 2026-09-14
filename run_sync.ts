import { PrismaClient } from '@prisma/client';
import { syncAllAssignmentsPPCT } from './src/actions/timetable';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting PPCT sync for schoolYear '2025-2026'...");
  await syncAllAssignmentsPPCT('2025-2026');
  console.log("Starting PPCT sync for schoolYear '2026-2027'...");
  await syncAllAssignmentsPPCT('2026-2027');
  console.log("Sync complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
