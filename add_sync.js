const fs = require('fs');

const file = 'src/actions/timetable.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('syncAllWeekPPCT')) {
  const code = `
export async function syncAllWeekPPCT(weekNumber: number, schoolYear: string, classIds?: string[]) {
  try {
    const slots = await prisma.timetableSlot.findMany({
      where: { 
        weekNumber, 
        schoolYear, 
        ...(classIds && classIds.length > 0 ? { assignment: { classId: { in: classIds } } } : {}) 
      },
      select: { assignmentId: true }
    });
    const uniqueAssignments = [...new Set(slots.map(s => s.assignmentId))];
    for (const aid of uniqueAssignments) {
      await syncAssignmentPPCT(aid, schoolYear);
    }
    revalidatePath('/dashboard/timetable');
    return { success: true };
  } catch(e: any) {
    return { success: false, error: e.message };
  }
}
`;
  content += code;
  fs.writeFileSync(file, content);
  console.log('Added syncAllWeekPPCT');
}
