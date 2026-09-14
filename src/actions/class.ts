"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClasses(schoolYear: string) {
  try {
    const classes = await prisma.class.findMany({
      where: { schoolYear },
      include: {
        homeroomTeacher: true,
      },
      orderBy: [
        { grade: "asc" },
        { name: "asc" }
      ]
    });
    return { success: true, data: classes };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách lớp học:", error);
    return { success: false, error: error.message };
  }
}

export async function createClass(data: {
  name: string;
  grade: number;
  schoolYear: string;
  homeroomTeacherId?: string;
}) {
  try {
    // Kiểm tra trùng tên lớp
    const existing = await prisma.class.findUnique({
      where: {
        name_schoolYear: {
          name: data.name,
          schoolYear: data.schoolYear
        }
      }
    });

    if (existing) {
      return { success: false, error: "Tên lớp này đã tồn tại trong năm học." };
    }

    const newClass = await prisma.class.create({
      data: {
        name: data.name,
        grade: data.grade,
        schoolYear: data.schoolYear,
        homeroomTeacherId: data.homeroomTeacherId || null,
      },
      include: {
        homeroomTeacher: true,
      }
    });

    revalidatePath("/dashboard/classes");
    return { success: true, data: newClass };
  } catch (error: any) {
    console.error("Lỗi thêm lớp học:", error);
    return { success: false, error: error.message };
  }
}

export async function updateClass(id: string, data: {
  name: string;
  grade: number;
  schoolYear: string;
  homeroomTeacherId?: string;
}) {
  try {
    // Nếu đổi tên, kiểm tra trùng lặp
    const existing = await prisma.class.findFirst({
      where: {
        name: data.name,
        schoolYear: data.schoolYear,
        id: { not: id } // Loại trừ chính nó
      }
    });

    if (existing) {
      return { success: false, error: "Tên lớp này đã tồn tại trong năm học." };
    }

    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        grade: data.grade,
        schoolYear: data.schoolYear,
        homeroomTeacherId: data.homeroomTeacherId || null,
      },
      include: {
        homeroomTeacher: true,
      }
    });

    revalidatePath("/dashboard/classes");
    return { success: true, data: updatedClass };
  } catch (error: any) {
    console.error("Lỗi cập nhật lớp học:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteClass(id: string) {
  try {
    await prisma.class.delete({
      where: { id }
    });

    revalidatePath("/dashboard/classes");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa lớp học:", error);
    return { success: false, error: error.message };
  }
}
