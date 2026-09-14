"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Lấy danh sách giáo viên
export async function getTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: {
          in: ["GV", "BGH"]
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return { success: true, data: teachers };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// Thêm mới giáo viên
export async function createTeacher(data: {
  name: string;
  shortName: string;
  permissions: string[];
  email?: string;
}) {
  try {
    const email = data.email || `gv_${Date.now()}@school.edu.vn`;
    
    const newTeacher = await prisma.user.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        permissions: data.permissions,
        email: email,
        passwordHash: "default_password_hash", // Cần hash thật trong thực tế
        role: "GV"
      }
    });

    revalidatePath("/dashboard/teachers");
    return { success: true, data: newTeacher };
  } catch (error: any) {
    console.error("Lỗi thêm giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// Cập nhật giáo viên
export async function updateTeacher(id: string, data: {
  name: string;
  shortName: string;
  permissions: string[];
  email?: string;
}) {
  try {
    const updateData: any = {
      name: data.name,
      shortName: data.shortName,
      permissions: data.permissions,
    };
    if (data.email) updateData.email = data.email;

    const updatedTeacher = await prisma.user.update({
      where: { id },
      data: updateData
    });

    revalidatePath("/dashboard/teachers");
    return { success: true, data: updatedTeacher };
  } catch (error: any) {
    console.error("Lỗi cập nhật giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// Xóa giáo viên
export async function deleteTeacher(id: string) {
  try {
    await prisma.user.delete({
      where: { id }
    });

    revalidatePath("/dashboard/teachers");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa giáo viên:", error);
    return { success: false, error: error.message };
  }
}
