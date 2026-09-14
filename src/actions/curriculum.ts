"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCurriculums(subjectId: string, grade: number) {
  try {
    const curriculums = await prisma.curriculum.findMany({
      where: {
        subjectId,
        grade
      },
      orderBy: {
        lessonNumber: 'asc'
      }
    });
    return { success: true, data: curriculums };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveCurriculums(subjectId: string, grade: number, lessons: { lessonNumber: number; lessonName: string; note: string }[]) {
  try {
    // Để an toàn và đồng bộ, ta xóa toàn bộ PPCT cũ của Subject + Grade này và tạo lại
    await prisma.$transaction(async (tx) => {
      await tx.curriculum.deleteMany({
        where: { subjectId, grade }
      });
      
      if (lessons.length > 0) {
        await tx.curriculum.createMany({
          data: lessons.map(l => ({
            subjectId,
            grade,
            lessonNumber: l.lessonNumber,
            lessonName: l.lessonName,
            note: l.note
          }))
        });
      }
    });
    
    revalidatePath("/dashboard/subjects");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
