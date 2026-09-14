"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDetailedSchoolPlans(schoolYear: string) {
  try {
    const plans = await prisma.weeklySchoolPlan.findMany({
      where: { schoolYear },
      orderBy: [
        { grade: "asc" },
        { subjectName: "asc" }
      ]
    });
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
