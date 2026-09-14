"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Fetch LBG (Lịch báo giảng) data for a specific teacher and weeks.
 */
export async function getLBGData(teacherId: string, weekNumbers: number[], schoolYear: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Fetch School Weeks to get start and end dates
    const schoolWeeks = await prisma.schoolWeek.findMany({
      where: {
        schoolYear,
        weekNumber: { in: weekNumbers },
      },
      orderBy: { weekNumber: "asc" },
    });

    // Fetch all SUBSTITUTE slots for these weeks to detect overridden normal slots
    const subSlots = await prisma.timetableSlot.findMany({
      where: {
        schoolYear,
        weekNumber: { in: weekNumbers },
        status: "SUBSTITUTE",
      },
      include: {
        assignment: {
          include: { teacher: true, subject: true }
        },
        teachingSchedules: true
      }
    });

    // Fetch all NORMAL slots in the same weeks to know what the substitute is overriding
    const normalSlots = await prisma.timetableSlot.findMany({
      where: {
        schoolYear,
        weekNumber: { in: weekNumbers },
        status: "NORMAL",
      },
      include: {
        assignment: {
          include: { teacher: true, subject: true }
        }
      }
    });

    // 2. Fetch Timetable Slots for the teacher
    const slots = await prisma.timetableSlot.findMany({
      where: {
        schoolYear,
        weekNumber: { in: weekNumbers },
        assignment: {
          teacherId: teacherId,
        },
      },
      include: {
        assignment: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          },
        },
        teachingSchedules: {
          include: {
            curriculum: true,
          },
        },
      },
      orderBy: [
        { weekNumber: "asc" },
        { dayOfWeek: "asc" },
        { session: "desc" }, // SANG, CHIEU
        { period: "asc" },
      ],
    });

    // 3. Format the data for the frontend
    const groupedData: Record<number, any> = {};
    let teacherName = "";

    for (const week of schoolWeeks) {
      groupedData[week.weekNumber] = {
        weekInfo: week,
        slots: [],
      };
    }

    for (const slot of slots) {
      if (!teacherName && slot.assignment.teacher.name) {
        teacherName = slot.assignment.teacher.name;
      }
      
      if (!groupedData[slot.weekNumber]) {
        groupedData[slot.weekNumber] = { weekInfo: null, slots: [] };
      }

      // Check if slot has a TeachingSchedule, else generate default info
      const ts = slot.teachingSchedules[0]; // Assuming 1-to-1 or taking the first one
      
      let adjustments = "";
      let isOverridden = false;
      let overriddenByTeacher = "";
      let overriddenBySubject = "";
      let finalLessonNum = ts?.actualLessonNum || null;
      let finalLessonName = ts?.actualLessonName || "Chưa cập nhật tên bài";

      if (slot.status === "NORMAL") {
        // Kiểm tra xem tiết này có bị giáo viên khác dạy thay không
        const substituteSlot = subSlots.find(
          s => s.weekNumber === slot.weekNumber &&
               s.dayOfWeek === slot.dayOfWeek &&
               s.session === slot.session &&
               s.period === slot.period &&
               s.assignment.classId === slot.assignment.classId
        );
        
        if (substituteSlot) {
          isOverridden = true;
          overriddenByTeacher = substituteSlot.assignment.teacher.shortName || substituteSlot.assignment.teacher.name;
          overriddenBySubject = substituteSlot.assignment.subject.name;
          // TRẢ LẠI PPCT CỦA CHÍNH GIÁO VIÊN ĐÓ (không copy của người dạy thay nữa)
          // Để đảm bảo "tiết mang đi lấp có PPCT bằng 1" như người dùng mong muốn
          finalLessonNum = ts?.actualLessonNum || null;
          finalLessonName = ts?.actualLessonName || "Chưa cập nhật tên bài";
        }
      }
      
      let overriddenNormalSlot = null;
      if (slot.status === "SUBSTITUTE") {
        // Tìm tiết NORMAL gốc mà tiết dạy thay này đang lấp
        overriddenNormalSlot = normalSlots.find(
          s => s.weekNumber === slot.weekNumber &&
               s.dayOfWeek === slot.dayOfWeek &&
               s.session === slot.session &&
               s.period === slot.period &&
               s.assignment.classId === slot.assignment.classId
        );
      }

      if (slot.status === "SUBSTITUTE") {
        const replaceText = overriddenNormalSlot 
          ? `Dạy vào giờ môn ${overriddenNormalSlot.assignment.subject.name} - GV: ${overriddenNormalSlot.assignment.teacher.name}` 
          : "Dạy thay/Điều chỉnh";
        adjustments = ts?.preparation ? `${replaceText}, ${ts.preparation}` : replaceText;
      } else if (isOverridden) {
        const replaceText = `Không dạy (do môn ${overriddenBySubject}, GV: ${overriddenByTeacher} dạy vào)`;
        adjustments = ts?.preparation ? `${replaceText}, ${ts.preparation}` : replaceText;
      } else {
        adjustments = ts?.preparation || "";
      }

      groupedData[slot.weekNumber].slots.push({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        session: slot.session,
        period: slot.period,
        subjectName: slot.assignment.subject.name,
        className: slot.assignment.class.name,
        lessonNum: finalLessonNum,
        lessonName: finalLessonName,
        adjustments: adjustments,
        note: ts?.note || "",
        isOverridden: isOverridden,
        status: slot.status,
      });
    }

    // Convert object to array sorted by weekNumber
    const weeks = Object.keys(groupedData)
      .map((w) => parseInt(w, 10))
      .sort((a, b) => a - b)
      .map((w) => groupedData[w]);

    // 4. Fetch full PPCT for this teacher's assigned subjects and grades
    const teacherAssignments = await prisma.assignment.findMany({
      where: { teacherId, schoolYear },
      include: { class: true }
    });
    
    const subjectGrades = new Set<string>();
    teacherAssignments.forEach(a => {
      subjectGrades.add(`${a.subjectId}-${a.class.grade}`);
    });
    
    let fullPPCT: any[] = [];
    if (subjectGrades.size > 0) {
      fullPPCT = await prisma.curriculum.findMany({
        where: {
          OR: Array.from(subjectGrades).map(sg => {
            const [subjectId, grade] = sg.split("-");
            return { subjectId, grade: parseInt(grade, 10) };
          })
        },
        include: { subject: { select: { name: true } } },
        orderBy: { lessonNumber: 'asc' }
      });
    }

    return { success: true, data: { teacherName, weeks, fullPPCT } };
  } catch (error: any) {
    console.error("Lỗi khi tải dữ liệu LBG:", error);
    return { success: false, error: error.message };
  }
}
