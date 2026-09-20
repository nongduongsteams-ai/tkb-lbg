"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function getPlanSubjectName(subName: string): string {
  const lower = subName.toLowerCase();
  if (lower.includes("khoa học tự nhiên") || lower.includes("khtn")) return "KHTN";
  if (lower.includes("lịch sử và địa lí") || lower.includes("ls và đl")) return "LS và ĐL";
  if (lower.includes("trải nghiệm") || lower.includes("hđtn")) return "HĐTNHN";
  if (lower.includes("nghệ thuật")) return "Nghệ thuật";
  if (lower.includes("công nghệ")) return "Công nghệ";
  
  if (subName.includes("(")) return subName.split("(")[0].trim();
  return subName;
}

export async function getSubjects(schoolYear: string = "2026-2027", userId?: string, isFullAccess: boolean = true) {
  try {
    const weeklyPlans = await prisma.weeklySchoolPlan.findMany({
      where: { schoolYear }
    });
    const schoolPlans = await prisma.schoolPlan.findMany({
      where: { schoolYear }
    });

    if (isFullAccess) {
      // 1. Sync subjects with WeeklySchoolPlan & SchoolPlan
      const expected = new Set<string>();
      
      // Add all subjects from weekly plans (these are detailed, e.g., Khoa học tự nhiên (Lí))
      weeklyPlans.forEach(wp => {
        expected.add(`${wp.grade}|${wp.subjectName}`);
      });

      // Add subjects from school plans if they don't have detailed weekly plans yet
      schoolPlans.forEach(sp => {
        const hasDetailed = weeklyPlans.some(wp => wp.grade === sp.grade && getPlanSubjectName(wp.subjectName) === sp.subjectName);
        if (!hasDetailed) {
          expected.add(`${sp.grade}|${sp.subjectName}`);
        }
      });

      // Get current subjects
      const currentSubjects = await prisma.subject.findMany();

      // Create missing subjects
      for (const item of expected) {
        const [gradeStr, name] = item.split('|');
        const grade = parseInt(gradeStr);
        if (!currentSubjects.some(s => s.grade === grade && s.name === name)) {
          await prisma.subject.create({
            data: {
              name,
              grade,
              color: "#6366f1"
            }
          });
        }
      }

      // Delete extra subjects (if they don't have PPCT)
      for (const s of currentSubjects) {
        if (!expected.has(`${s.grade}|${s.name}`)) {
          try {
            await prisma.subject.delete({ where: { id: s.id } });
          } catch (e) {
            // Ignore delete error (likely due to existing Curriculums)
          }
        }
      }
    }

    let assignedSubjectIds: string[] | undefined;
    if (!isFullAccess && userId) {
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: userId, schoolYear },
        select: { subjectId: true }
      });
      assignedSubjectIds = Array.from(new Set(assignments.map(a => a.subjectId)));
    }

    // 2. Fetch updated subjects
    const subjects = await prisma.subject.findMany({
      where: assignedSubjectIds ? { id: { in: assignedSubjectIds } } : undefined,
      orderBy: [
        { grade: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { curriculums: true }
        }
      }
    });

    const data = subjects.map(s => {
      const planName = getPlanSubjectName(s.name);
      const plan = schoolPlans.find(p => p.grade === s.grade && p.subjectName === planName);
      return {
        ...s,
        uploadedCount: s._count.curriculums,
        targetCount: plan ? plan.totalYear : 0,
        planName
      };
    });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSubject(data: { name: string; grade: number; color?: string; parentSubjectId?: string | null }) {
  try {
    const subject = await prisma.subject.create({
      data: {
        name: data.name,
        grade: data.grade,
        color: data.color || "#6366f1",
        parentSubjectId: data.parentSubjectId || null
      }
    });
    revalidatePath("/dashboard/subjects");
    return { success: true, data: subject };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Môn học này đã tồn tại trong khối." };
    }
    return { success: false, error: error.message };
  }
}

export async function updateSubject(id: string, data: { name: string; grade: number; color?: string; parentSubjectId?: string | null }) {
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        grade: data.grade,
        color: data.color,
        parentSubjectId: data.parentSubjectId || null
      }
    });
    revalidatePath("/dashboard/subjects");
    return { success: true, data: subject };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Môn học này đã tồn tại trong khối." };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteSubject(id: string) {
  try {
    await prisma.subject.delete({
      where: { id }
    });
    revalidatePath("/dashboard/subjects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Không thể xóa môn học (Có thể đang được dùng trong Phân công hoặc PPCT)." };
  }
}
