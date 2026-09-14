import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slots = await prisma.timetableSlot.findMany({
    where: {
      weekNumber: 1,
      schoolYear: '2026-2027',
      dayOfWeek: 4,
      session: 'CHIEU',
      assignment: {
        class: {
          branch: 'Phân hiệu'
        }
      }
    },
    select: { id: true }
  });

  const slotIds = slots.map(s => s.id);

  if (slotIds.length > 0) {
    await prisma.teachingSchedule.deleteMany({
      where: {
        timetableSlotId: { in: slotIds }
      }
    });

    await prisma.timetableSlot.deleteMany({
      where: {
        id: { in: slotIds }
      }
    });
    console.log(`Deleted ${slotIds.length} slots for T4 CHIEU`);
  } else {
    console.log("No slots found for T4 CHIEU");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
