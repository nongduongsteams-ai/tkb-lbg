"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSchoolWeeks(schoolYear: string) {
  try {
    const weeks = await prisma.schoolWeek.findMany({
      where: { schoolYear },
      orderBy: { weekNumber: "asc" },
    });
    return { success: true, data: weeks };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách tuần:", error);
    return { success: false, error: error.message };
  }
}

export async function autoGenerateWeeks(
  schoolYear: string,
  startDateStr: string,
  totalWeeks: number
) {
  try {
    const startDate = new Date(startDateStr);
    const operations = [];

    for (let i = 1; i <= totalWeeks; i++) {
      const currentStart = new Date(startDate);
      currentStart.setDate(startDate.getDate() + (i - 1) * 7);

      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6);

      const semester = i <= 18 ? 1 : 2; // Giả định học kỳ 1 có 18 tuần

      operations.push(
        prisma.schoolWeek.upsert({
          where: {
            schoolYear_weekNumber: {
              schoolYear,
              weekNumber: i,
            },
          },
          update: {
            startDate: currentStart,
            endDate: currentEnd,
            semester,
          },
          create: {
            schoolYear,
            weekNumber: i,
            startDate: currentStart,
            endDate: currentEnd,
            semester,
          },
        })
      );
    }

    await prisma.$transaction(operations);
    revalidatePath("/dashboard/settings");

    return { success: true, message: "Sinh danh sách tuần thành công." };
  } catch (error: any) {
    console.error("Lỗi sinh tuần tự động:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSchoolWeek(
  id: string,
  data: {
    weekNumber?: number;
    startDate?: string;
    endDate?: string;
    semester?: number;
    isBreak?: boolean;
    note?: string;
    isShiftNext?: boolean;
  }
) {
  try {
    const targetWeek = await prisma.schoolWeek.findUnique({ where: { id } });
    if (!targetWeek) return { success: false, error: "Không tìm thấy tuần" };

    const oldWeekNumber = targetWeek.weekNumber;
    const wasBreak = targetWeek.isBreak;
    const isBreakNow = data.isBreak ?? wasBreak;
    
    const updateData: any = { ...data };
    delete updateData.isShiftNext;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.weekNumber) updateData.weekNumber = Number(data.weekNumber);

    // Xử lý logic chuyển đổi tuần học <-> tuần nghỉ
    if (!wasBreak && isBreakNow) {
      // 1. Tìm weekNumber trống cho tuần nghỉ (>100)
      const maxBreakWeek = await prisma.schoolWeek.findFirst({
        where: { schoolYear: targetWeek.schoolYear, weekNumber: { gte: 100 } },
        orderBy: { weekNumber: 'desc' }
      });
      const newBreakWeekNum = maxBreakWeek ? maxBreakWeek.weekNumber + 1 : 101;
      
      // 2. Kéo dồn các tuần học phía sau (shift -1)
      const affectedWeeks = await prisma.schoolWeek.findMany({
        where: { 
          schoolYear: targetWeek.schoolYear, 
          weekNumber: { gt: oldWeekNumber, lt: 100 },
          id: { not: id }
        },
        orderBy: { weekNumber: 'asc' } 
      });
      
      const operations = [];
      // Đẩy update của tuần hiện tại (chuyển sang >100) lên ĐẦU để giải phóng weekNumber
      operations.push(prisma.schoolWeek.update({
        where: { id },
        data: { ...updateData, weekNumber: newBreakWeekNum }
      }));
      
      for (const w of affectedWeeks) {
        operations.push(prisma.schoolWeek.update({
          where: { id: w.id },
          data: { weekNumber: w.weekNumber - 1 }
        }));
      }
      
      await prisma.$transaction(operations);
      revalidatePath("/dashboard/settings");
      return { success: true };
    } 
    else if (wasBreak && !isBreakNow) {
      // Đang từ nghỉ lễ khôi phục thành tuần học bình thường
      const targetNormalWeekNum = data.weekNumber || 1; 
      
      // Đẩy dãn các tuần học phía sau (shift +1)
      const affectedWeeks = await prisma.schoolWeek.findMany({
        where: { 
          schoolYear: targetWeek.schoolYear, 
          weekNumber: { gte: targetNormalWeekNum, lt: 100 },
          id: { not: id }
        },
        orderBy: { weekNumber: 'desc' } 
      });
      
      const operations = [];
      for (const w of affectedWeeks) {
        operations.push(prisma.schoolWeek.update({
          where: { id: w.id },
          data: { weekNumber: w.weekNumber + 1 }
        }));
      }
      
      operations.push(prisma.schoolWeek.update({
        where: { id },
        data: { ...updateData, weekNumber: targetNormalWeekNum }
      }));
      
      await prisma.$transaction(operations);
      revalidatePath("/dashboard/settings");
      return { success: true };
    }
    
    // Logic tịnh tiến bình thường (đổi số thứ tự tuần)
    const newWeekNumber = data.weekNumber ?? oldWeekNumber;
    if (data.isShiftNext && newWeekNumber !== oldWeekNumber && !wasBreak) {
      const delta = newWeekNumber - oldWeekNumber;
      const affectedWeeks = await prisma.schoolWeek.findMany({
        where: { 
          schoolYear: targetWeek.schoolYear, 
          weekNumber: { gte: Math.min(oldWeekNumber, newWeekNumber), lt: 100 },
          id: { not: id } 
        },
        orderBy: { weekNumber: delta > 0 ? "desc" : "asc" }
      });
      
      const operations = [];
      for (const w of affectedWeeks) {
        operations.push(prisma.schoolWeek.update({
          where: { id: w.id },
          data: { weekNumber: w.weekNumber + delta }
        }));
      }
      operations.push(prisma.schoolWeek.update({
        where: { id },
        data: updateData
      }));
      
      await prisma.$transaction(operations);
      revalidatePath("/dashboard/settings");
      return { success: true };
    } else {
      const week = await prisma.schoolWeek.update({
        where: { id },
        data: updateData,
      });
      revalidatePath("/dashboard/settings");
      return { success: true, data: week };
    }
  } catch (error: any) {
    console.error("Lỗi cập nhật tuần:", error);
    if (error.code === 'P2002') {
      return { success: false, error: "Trùng lặp số tuần trong năm học. Vui lòng chọn 'Tịnh tiến' hoặc kiểm tra lại các tuần khác." };
    }
    return { success: false, error: error.message };
  }
}

export async function deleteSchoolWeek(id: string) {
  try {
    await prisma.schoolWeek.delete({
      where: { id },
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa tuần:", error);
    return { success: false, error: error.message };
  }
}

export async function appendSchoolWeek(schoolYear: string) {
  try {
    const lastNormalWeek = await prisma.schoolWeek.findFirst({
      where: { schoolYear, weekNumber: { lt: 100 } },
      orderBy: { weekNumber: 'desc' }
    });
    
    const lastAbsoluteWeek = await prisma.schoolWeek.findFirst({
      where: { schoolYear },
      orderBy: { endDate: 'desc' }
    });
    
    if (!lastNormalWeek || !lastAbsoluteWeek) {
      return { success: false, error: "Không tìm thấy tuần nào trong CSDL để thêm tiếp." };
    }
    
    const newWeekNum = lastNormalWeek.weekNumber + 1;
    const newStartDate = new Date(lastAbsoluteWeek.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newEndDate.getDate() + 6);
    
    const semester = lastNormalWeek.semester;
    
    await prisma.schoolWeek.create({
      data: {
        schoolYear,
        weekNumber: newWeekNum,
        startDate: newStartDate,
        endDate: newEndDate,
        semester,
        isBreak: false,
      }
    });
    
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi thêm tuần mới:", error);
    return { success: false, error: error.message };
  }
}
