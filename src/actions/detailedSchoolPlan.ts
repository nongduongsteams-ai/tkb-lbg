"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDetailedSchoolPlans(schoolYear: string, userId?: string, isFullAccess: boolean = true) {
  try {
    let assignedSubjectNames: string[] | undefined;
    if (!isFullAccess && userId) {
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: userId, schoolYear },
        include: { subject: true }
      });
      // LBG detailed plans might have "Toán" or "Khoa học tự nhiên (Lí)"
      // So we filter loosely, or exactly. The `subject.name` could be "KHTN" 
      // but `subjectName` in weekly plan could be "Khoa học tự nhiên (Lí)".
      // But `Assignment` subjectName is usually standard. 
      // Actually, wait, `Assignment` subjectName isn't there, it's `Assignment.subject.name`.
      // Let's just map it:
      assignedSubjectNames = Array.from(new Set(assignments.map(a => a.subject.name)));
    }

    const plans = await prisma.weeklySchoolPlan.findMany({
      where: { schoolYear },
      orderBy: [
        { grade: "asc" },
        { subjectName: "asc" }
      ]
    });

    if (assignedSubjectNames && !isFullAccess) {
      // Because `subjectName` in detailed plan could be complex like "Khoa học tự nhiên (Vật lí)"
      // We check if it starts with or matches any of assignedSubjectNames.
      const filtered = plans.filter(p => {
        const pNameLower = p.subjectName.toLowerCase();
        return assignedSubjectNames!.some(asn => pNameLower.includes(asn.toLowerCase()) || asn.toLowerCase().includes(pNameLower));
      });
      return { success: true, data: filtered };
    }

    return { success: true, data: plans };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveDetailedSchoolPlans(schoolYear: string, semester: number, plans: any[]) {
  try {
    for (const plan of plans) {
      const existing = await prisma.weeklySchoolPlan.findFirst({
        where: {
          schoolYear,
          grade: plan.grade,
          subjectName: plan.subjectName,
          semester
        }
      });

      if (existing) {
        await prisma.weeklySchoolPlan.update({
          where: { id: existing.id },
          data: {
            weeklyData: plan.weeklyData
          }
        });
      } else {
        await prisma.weeklySchoolPlan.create({
          data: {
            schoolYear,
            grade: plan.grade,
            subjectName: plan.subjectName,
            semester,
            weeklyData: plan.weeklyData
          }
        });
      }
    }
    revalidatePath("/dashboard/school-plan-detailed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDetailedSchoolPlan(schoolYear: string, grade: number, subjectName: string) {
  try {
    await prisma.weeklySchoolPlan.deleteMany({
      where: {
        schoolYear,
        grade,
        subjectName
      }
    });
    revalidatePath("/dashboard/school-plan-detailed");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
