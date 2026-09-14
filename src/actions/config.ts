"use server";

import { prisma } from "@/lib/prisma";

export async function getSupportedGrades() {
  try {
    const newConfig = await prisma.systemConfig.findUnique({
      where: { key: "SUPPORTED_GRADES_LIST" }
    });
    
    if (newConfig && newConfig.value) {
      const grades = JSON.parse(newConfig.value) as number[];
      return grades.sort((a,b) => a - b);
    }

    const config = await prisma.systemConfig.findUnique({
      where: { key: "SUPPORTED_LEVELS" }
    });

    if (!config || !config.value) {
      // Mặc định THCS nếu chưa cấu hình
      return [6, 7, 8, 9];
    }

    const levels = JSON.parse(config.value) as string[];
    let grades: number[] = [];

    if (levels.includes("TH")) {
      grades.push(1, 2, 3, 4, 5);
    }
    if (levels.includes("THCS")) {
      grades.push(6, 7, 8, 9);
    }
    if (levels.includes("THPT")) {
      grades.push(10, 11, 12);
    }

    // Nếu rỗng, vẫn trả về THCS để an toàn
    return grades.length > 0 ? grades.sort((a, b) => a - b) : [6, 7, 8, 9];
  } catch (error) {
    console.error("Lỗi lấy cấu hình cấp học:", error);
    return [6, 7, 8, 9];
  }
}

export async function saveSupportedGradesList(grades: number[]) {
  try {
    await prisma.systemConfig.upsert({
      where: { key: "SUPPORTED_GRADES_LIST" },
      update: { value: JSON.stringify(grades) },
      create: { key: "SUPPORTED_GRADES_LIST", value: JSON.stringify(grades) },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi lưu cấu hình khối lớp:", error);
    return { success: false, error: error.message };
  }
}

export async function getPreparationDay() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "PREPARATION_DAY_OF_WEEK" }
    });
    
    if (config && config.value) {
      return parseInt(config.value); // 2-8 (2: Thứ 2, ..., 8: Chủ nhật)
    }
    return 5; // Mặc định thứ 5
  } catch (error) {
    console.error("Lỗi lấy ngày soạn bài:", error);
    return 5;
  }
}

export async function savePreparationDay(day: number) {
  try {
    await prisma.systemConfig.upsert({
      where: { key: "PREPARATION_DAY_OF_WEEK" },
      update: { value: day.toString() },
      create: { key: "PREPARATION_DAY_OF_WEEK", value: day.toString() },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi lưu cấu hình ngày soạn:", error);
    return { success: false, error: error.message };
  }
}
