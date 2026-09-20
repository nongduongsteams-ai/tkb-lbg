"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSchoolPlans(schoolYear: string, userId?: string, isFullAccess: boolean = true) {
  try {
    let assignedSubjectNames: string[] | undefined;
    if (!isFullAccess && userId) {
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: userId, schoolYear },
        include: { subject: true }
      });
      assignedSubjectNames = Array.from(new Set(assignments.map(a => a.subject.name)));
    }

    const plans = await prisma.schoolPlan.findMany({
      where: { 
        schoolYear,
        ...(assignedSubjectNames ? { subjectName: { in: assignedSubjectNames } } : {})
      },
      orderBy: [
        { grade: 'asc' },
        { subjectName: 'asc' }
      ]
    });
    return { success: true, data: plans };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSchoolPlan(data: any) {
  try {
    const plan = await prisma.schoolPlan.create({
      data: {
        schoolYear: data.schoolYear,
        grade: parseInt(data.grade),
        subjectName: data.subjectName,
        periodsPerWeekHk1: parseFloat(data.periodsPerWeekHk1),
        periodsPerWeekHk2: parseFloat(data.periodsPerWeekHk2),
        totalHk1: parseInt(data.totalHk1),
        totalHk2: parseInt(data.totalHk2),
        totalYear: parseInt(data.totalYear),
        note: data.note || null,
      }
    });
    revalidatePath("/dashboard/school-plan");
    return { success: true, data: plan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSchoolPlan(id: string, data: any) {
  try {
    const plan = await prisma.schoolPlan.update({
      where: { id },
      data: {
        grade: parseInt(data.grade),
        subjectName: data.subjectName,
        periodsPerWeekHk1: parseFloat(data.periodsPerWeekHk1),
        periodsPerWeekHk2: parseFloat(data.periodsPerWeekHk2),
        totalHk1: parseInt(data.totalHk1),
        totalHk2: parseInt(data.totalHk2),
        totalYear: parseInt(data.totalYear),
        note: data.note || null,
      }
    });
    revalidatePath("/dashboard/school-plan");
    return { success: true, data: plan };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSchoolPlan(id: string) {
  try {
    await prisma.schoolPlan.delete({
      where: { id }
    });
    revalidatePath("/dashboard/school-plan");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { getSupportedGrades } from "./config";

export async function saveSubjectMatrix(schoolYear: string, subjectName: string, oldSubjectName: string, gradesData: any) {
  try {
    const supportedGrades = await getSupportedGrades();
    for (const grade of supportedGrades) {
      const data = gradesData[grade];
      if (!data) continue;

      const existing = await prisma.schoolPlan.findFirst({
        where: {
          schoolYear,
          grade,
          subjectName: oldSubjectName || subjectName
        }
      });

      const periodsPerWeekHk1 = parseFloat(data.periodsPerWeekHk1) || Math.round((parseInt(data.totalHk1) / 18) * 10) / 10 || 0;
      const periodsPerWeekHk2 = parseFloat(data.periodsPerWeekHk2) || Math.round((parseInt(data.totalHk2) / 17) * 10) / 10 || 0;

      if (existing) {
        await prisma.schoolPlan.update({
          where: { id: existing.id },
          data: {
            subjectName: subjectName,
            totalHk1: parseInt(data.totalHk1) || 0,
            totalHk2: parseInt(data.totalHk2) || 0,
            totalYear: parseInt(data.totalYear) || 0,
            periodsPerWeekHk1,
            periodsPerWeekHk2,
          }
        });
      } else {
        await prisma.schoolPlan.create({
          data: {
            schoolYear,
            grade,
            subjectName: subjectName,
            totalHk1: parseInt(data.totalHk1) || 0,
            totalHk2: parseInt(data.totalHk2) || 0,
            totalYear: parseInt(data.totalYear) || 0,
            periodsPerWeekHk1,
            periodsPerWeekHk2,
          }
        });
      }
    }
    revalidatePath("/dashboard/school-plan");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSubjectMatrix(schoolYear: string, subjectName: string) {
  try {
    await prisma.schoolPlan.deleteMany({
      where: { schoolYear, subjectName }
    });
    revalidatePath("/dashboard/school-plan");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
