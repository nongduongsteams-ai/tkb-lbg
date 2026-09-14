import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const subjectMap: Record<string, string> = {
  'văn': 'Ngữ văn',
  'anh': 'Ngoại ngữ 1',
  'khtn( sinh)': 'Khoa học tự nhiên (Sinh)',
  'khtn(sinh)': 'Khoa học tự nhiên (Sinh)',
  'khtn( hóa)': 'Khoa học tự nhiên (Hóa)',
  'khtn(hóa)': 'Khoa học tự nhiên (Hóa)',
  'khtn( lý)': 'Khoa học tự nhiên (Lý)',
  'khtn(lý)': 'Khoa học tự nhiên (Lý)',
  'ls&đl( sử)': 'Lịch sử và Địa lí (Sử)',
  'ls&đl(sử)': 'Lịch sử và Địa lí (Sử)',
  'ls&đl( địa)': 'Lịch sử và Địa lí (Địa)',
  'ls&đl(địa)': 'Lịch sử và Địa lí (Địa)',
  'nt( nhạc)': 'Nghệ thuật (Âm nhạc)',
  'nt(nhạc)': 'Nghệ thuật (Âm nhạc)',
  'nt( mt)': 'Nghệ thuật (Mĩ thuật)',
  'nt(mt)': 'Nghệ thuật (Mĩ thuật)',
  'nt': 'Nghệ thuật (Mĩ thuật)', // Assuming NT without specifier is MT, seen in row 34
  'hđtnhn (cc)': 'HĐTN, HN (Chào cờ)',
  'hđtn-hn': 'HĐTN, HN (TN CĐ)',
  'hđtnhn': 'HĐTN, HN (TN CĐ)',
  'hđtnhn (sh)': 'HĐTN, HN (Sinh hoạt lớp)',
  'cn': 'Công nghệ',
  'tin': 'Tin học',
  'gdcd': 'Giáo dục công dân',
  'dgcd': 'Giáo dục công dân', // Typo in markdown
  'gdtc': 'Giáo dục thể chất',
  'gdđp': 'Giáo dục địa phương',
  'toán': 'Toán',
  'hđ đội': 'HĐTN, HN (TN CĐ)' // Map HĐ Đội to HĐTN
};

async function main() {
  const mdPath = "D:/GOOGLE DRIVER NVD/Project AI 2026/TKB-LBG/Thời khoá biểu Điểm trường.md";
  const content = fs.readFileSync(mdPath, "utf-8");
  const lines = content.split('\n');

  // Find existing slots for week 1 Phân hiệu
  const existingSlots = await prisma.timetableSlot.findMany({
    where: {
      weekNumber: 1,
      schoolYear: '2026-2027',
      assignment: {
        class: {
          branch: 'Phân hiệu'
        }
      }
    },
    select: { id: true }
  });
  
  const slotIds = existingSlots.map(s => s.id);

  if (slotIds.length > 0) {
    // Delete related teaching schedules first due to FK constraints
    await prisma.teachingSchedule.deleteMany({
      where: {
        timetableSlotId: {
          in: slotIds
        }
      }
    });

    // Delete existing slots
    await prisma.timetableSlot.deleteMany({
      where: {
        id: {
          in: slotIds
        }
      }
    });
  }

  const classesConfig = [
    { name: '6B', subjIdx: 4, teacherIdx: 5 },
    { name: '6C', subjIdx: 6, teacherIdx: 7 },
    { name: '7B', subjIdx: 8, teacherIdx: 9 },
    { name: '8C', subjIdx: 10, teacherIdx: 11 },
    { name: '8D', subjIdx: 12, teacherIdx: 13 },
    { name: '9B', subjIdx: 14, teacherIdx: 15 },
    { name: '9C', subjIdx: 16, teacherIdx: 17 }
  ];

  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('| Thứ |') || line.includes('|---|')) continue;
    
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 18) continue;
    
    const day = parseInt(parts[1], 10);
    const sessionStr = parts[2].toUpperCase();
    const session = sessionStr === 'SÁNG' ? 'SANG' : 'CHIEU';
    const period = parseInt(parts[3], 10);
    
    if (isNaN(day) || isNaN(period)) continue;

    for (const conf of classesConfig) {
      let subjRaw = parts[conf.subjIdx];
      let teacherRaw = parts[conf.teacherIdx];
      
      if (!subjRaw) continue;
      
      const subjFull = subjectMap[subjRaw.toLowerCase()];
      if (!subjFull) continue;
      
      // Look up assignment
      const classObj = await prisma.class.findFirst({
        where: { name: conf.name, schoolYear: '2026-2027', branch: 'Phân hiệu' }
      });
      if (!classObj) continue;

      let assignments = await prisma.assignment.findMany({
        where: { classId: classObj.id, subject: { name: subjFull } },
        include: { teacher: true }
      });

      if (assignments.length === 0) {
        console.log(`NO ASSIGNMENT FOUND FOR ${conf.name} - ${subjFull}`);
        continue;
      }

      let chosenAssignment = assignments[0];
      if (assignments.length > 1 && teacherRaw) {
        // match teacher
        // clean teacher raw like "Hương PĐ" -> "Hương"
        const teacherShort = teacherRaw.split(' ')[0];
        const match = assignments.find(a => 
          a.teacher.shortName?.includes(teacherShort) || 
          a.teacher.name.includes(teacherShort)
        );
        if (match) chosenAssignment = match;
      }

      await prisma.timetableSlot.create({
        data: {
          weekNumber: 1,
          dayOfWeek: day,
          period,
          session,
          schoolYear: '2026-2027',
          assignmentId: chosenAssignment.id
        }
      });
      console.log(`Inserted: ${conf.name} - T${day} - ${session} - P${period} -> ${subjFull}`);
    }
  }

  console.log("XONG!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
