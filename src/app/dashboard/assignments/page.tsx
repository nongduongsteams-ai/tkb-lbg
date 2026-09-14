import { prisma } from "@/lib/prisma";
import AssignmentClient from "./AssignmentClient";

export default async function AssignmentsPage() {
  const currentSchoolYear = "2026-2027"; // TODO: Lấy từ cấu hình hệ thống
  
  // Lấy toàn bộ dữ liệu cần thiết
  const [assignments, teachers, subjects, classes] = await Promise.all([
    prisma.assignment.findMany({
      where: { schoolYear: currentSchoolYear },
      include: {
        teacher: true,
        subject: true,
        class: true,
      }
    }),
    prisma.user.findMany({
      where: { 
        role: { in: ["GV", "BGH"] },
        permissions: { has: "GVBM" }
      }
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.class.findMany({
      where: { schoolYear: currentSchoolYear },
      orderBy: [
        { grade: "asc" },
        { name: "asc" }
      ]
    })
  ]);

  // Sắp xếp giáo viên theo Tên (từ cuối cùng), hỗ trợ tiếng Việt
  const getParts = (name: string) => {
    let cleanName = name.replace(/^(Ông|Bà)\s+/i, '').trim();
    const parts = cleanName.split(' ');
    const firstName = parts.pop() || "";
    const restName = parts.join(' ');
    return { firstName, restName };
  };

  const sortedTeachers = teachers.sort((a, b) => {
    const pA = getParts(a.name);
    const pB = getParts(b.name);
    
    const cmp = pA.firstName.localeCompare(pB.firstName, 'vi');
    if (cmp !== 0) return cmp;
    return pA.restName.localeCompare(pB.restName, 'vi');
  });

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden bg-gray-50 flex flex-col">
      <div 
        className="bg-white border border-[#e5e7eb] rounded-3xl shadow-sm flex flex-col h-full overflow-hidden"
        style={{ padding: '0px' }}
      >
        <AssignmentClient 
          initialAssignments={assignments} 
          teachers={sortedTeachers}
          subjects={subjects}
          classes={classes}
          currentSchoolYear={currentSchoolYear} 
        />
      </div>
    </div>
  );
}
