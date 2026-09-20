"use client";

import React, { useState, useEffect, useRef } from "react";
import { getLBGData } from "@/actions/lbg";
import ExcelJS from "exceljs";
import { Download, Loader2, Calendar as CalendarIcon, User as UserIcon, ChevronDown, Check, EyeOff, Copy } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LBGClientProps {
  teachers: any[];
  schoolWeeks: any[];
  schoolYear: string;
  currentUserRole: string;
  currentUserId: string;
  prepDay?: number;
}

export default function LBGClient({ teachers, schoolWeeks, schoolYear, currentUserRole, currentUserId, prepDay = 5 }: LBGClientProps) {
  const defaultTeacher = currentUserRole === "GV" ? currentUserId : (teachers[0]?.id || "");
  
  const [selectedTeacher, setSelectedTeacher] = useState<string>(defaultTeacher);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lbgData, setLbgData] = useState<{ teacherName: string, weeks: any[] } | null>(null);
  
  const [hideEmptyPeriods, setHideEmptyPeriods] = useState<boolean>(false);
  const [isGroupedPlan, setIsGroupedPlan] = useState<boolean>(false);
  const [showLessonPlan, setShowLessonPlan] = useState<boolean>(false);

  // Dropdown state for weeks
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWeekDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedTeacher || selectedWeeks.length === 0) {
      setLbgData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      const res = await getLBGData(selectedTeacher, selectedWeeks, schoolYear);
      if (res.success && res.data) {
        setLbgData(res.data);
      } else {
        setLbgData(null);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [selectedTeacher, selectedWeeks, schoolYear]);

  const toggleWeek = (weekNum: number) => {
    setSelectedWeeks(prev => 
      prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]
    );
  };

  const selectAllWeeks = () => {
    if (selectedWeeks.length === schoolWeeks.length) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks(schoolWeeks.map(w => w.weekNumber));
    }
  };

  const getDayText = (day: number) => {
    return `Hai, Ba, Tư, Năm, Sáu, Bảy`.split(", ")[day - 2];
  };

  const calculateDateForDay = (weekStartDate: any, dayOfWeek: number) => {
    const start = new Date(weekStartDate);
    const date = new Date(start);
    date.setDate(date.getDate() + (dayOfWeek - 2));
    return format(date, "dd/MM/yyyy");
  };

  const calculatePrepDate = (weekStartDate: any, prepDayOfWeek: number) => {
    const start = new Date(weekStartDate);
    start.setDate(start.getDate() - 7); // Lùi về tuần trước
    start.setDate(start.getDate() + (prepDayOfWeek - 2));
    return format(start, "dd/MM/yyyy");
  };

  const cleanLessonName = (name: string) => {
    return name
      .replace(/\s*[\-\(\/]?\s*[Tt]iết\s*\d+(?:[\,\.\-]\s*\d+)*\s*[\)]?\s*$/i, '') // Matches ending " (Tiết 1, 2)"
      .replace(/^\s*[Tt]iết\s*\d+(?:[\,\.\-]\s*\d+)*\s*[\-\/\:\.]\s*/i, '') // Matches starting "Tiết 9,10 - "
      .trim();
  };

  const generateLessonPlanInfo = (weekData: any, grouped: boolean) => {
    const prepDateStr = calculatePrepDate(weekData.weekInfo.startDate, prepDay);
    const groups = new Map<string, any>();
    
    (weekData.slots || []).forEach((slot: any) => {
       if (!slot.subjectName || !slot.lessonName || !slot.lessonNum) return;
       const grade = slot.className.match(/^\d+/)?.[0] || "";
       const baseLessonName = cleanLessonName(slot.lessonName);
       const subjectWithGrade = grade ? `${slot.subjectName} - Khối ${grade}` : slot.subjectName;
       const key = `${subjectWithGrade}___${baseLessonName}`;
       
       if (!groups.has(key)) {
         groups.set(key, {
           subject: subjectWithGrade,
           lessonName: baseLessonName,
           normalizedLessonName: baseLessonName.toLowerCase(),
           subjectName: slot.subjectName,
           grade,
           periods: new Set<number>(),
           classMap: new Map<string, any>()
         });
       }
       
       const group = groups.get(key);
       
       if (!group.classMap.has(slot.className)) {
         group.classMap.set(slot.className, { 
           className: slot.className, 
           periodMap: {}, 
           anchorSlot: slot
         });
       } else {
         const classData = group.classMap.get(slot.className);
         if (classData.anchorSlot.status !== 'NORMAL' && slot.status === 'NORMAL') {
           classData.anchorSlot = slot;
         }
       }
    });
    
    // Process groups to extrapolate dates using fullPPCT
    Array.from(groups.values()).forEach(group => {
       const subjectPPCT = (lbgData?.fullPPCT || []).filter((p: any) => p.subject.name === group.subjectName && p.grade.toString() === group.grade);
       const matchedPPCT = subjectPPCT.filter((p: any) => cleanLessonName(p.lessonName).toLowerCase() === group.normalizedLessonName);
       
       const periodsToExtrapolate = new Set<number>();
       matchedPPCT.forEach((p: any) => periodsToExtrapolate.add(p.lessonNumber));
       
       Array.from(group.classMap.values()).forEach((c: any) => {
         if (c.anchorSlot && c.anchorSlot.lessonNum) {
           periodsToExtrapolate.add(c.anchorSlot.lessonNum);
         }
       });
       
       group.periods = periodsToExtrapolate;
       
       Array.from(group.classMap.values()).forEach((c: any) => {
          let cycle = weekData.slots
            .filter((s: any) => s.className === c.className && s.subjectName === group.subjectName && s.status === 'NORMAL')
            .sort((a: any, b: any) => {
              if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
              if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
              return a.period - b.period;
            });
          
          if (cycle.length === 0) {
            cycle = weekData.slots
              .filter((s: any) => s.className === c.className && s.subjectName === group.subjectName)
              .sort((a: any, b: any) => {
                if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
                return a.period - b.period;
              });
          }
          
          if (cycle.length === 0 || !c.anchorSlot || !c.anchorSlot.lessonNum) return;
          
          let anchorIndex = cycle.findIndex((s: any) => s.id === c.anchorSlot.id);
          
          // If anchor is a substitute and not in cycle, just use the first item in cycle as the anchor base
          if (anchorIndex === -1 && cycle.length > 0) {
            c.anchorSlot = cycle[0];
            anchorIndex = 0;
          }
          
          if (anchorIndex === -1) return;
          
          periodsToExtrapolate.forEach((p: number) => {
             const actualSlot = weekData.slots.find((s: any) => s.className === c.className && s.subjectName === group.subjectName && s.lessonNum === p);
             if (actualSlot) {
                const dateStr = calculateDateForDay(weekData.weekInfo.startDate, actualSlot.dayOfWeek);
                const sessionStr = actualSlot.session === 'SANG' ? 'Sáng' : 'Chiều';
                c.periodMap[p] = `${sessionStr} ${dateStr}`;
             } else {
                const deltaPeriods = p - c.anchorSlot.lessonNum;
                let targetIndex = (anchorIndex + deltaPeriods) % cycle.length;
                if (targetIndex < 0) targetIndex += cycle.length;
                
                const weekOffset = Math.floor((anchorIndex + deltaPeriods) / cycle.length);
                const targetCycleSlot = cycle[targetIndex];
                
                const baseDateStr = calculateDateForDay(weekData.weekInfo.startDate, targetCycleSlot.dayOfWeek);
                const [dd, mm, yyyy] = baseDateStr.split('/');
                const extrapolatedDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
                extrapolatedDate.setDate(extrapolatedDate.getDate() + weekOffset * 7);
                
                const finalDateStr = format(extrapolatedDate, 'dd/MM/yyyy');
                const sessionStr = targetCycleSlot.session === 'SANG' ? 'Sáng' : 'Chiều';
                
                c.periodMap[p] = `${sessionStr} ${finalDateStr}`;
             }
          });
       });
    });
    
    return Array.from(groups.values()).map(group => {
      const sortedClasses = Array.from(group.classMap.values()).sort((a: any, b: any) => a.className.localeCompare(b.className));
      const periods = Array.from(group.periods as Set<number>).sort((a, b) => a - b);
      const prepDayName = prepDay === 8 ? 'Chủ nhật' : `Thứ ${prepDay}`;
      
      const firstPeriodOfLesson = periods[0];
      let isAlreadyPrepared = false;
      if (grouped && firstPeriodOfLesson !== undefined) {
         const minPeriodThisWeek = Math.min(
           ...weekData.slots
             .filter((s: any) => s.subjectName === group.subjectName && cleanLessonName(s.lessonName) === group.lessonName)
             .map((s: any) => s.lessonNum)
         );
         if (minPeriodThisWeek > firstPeriodOfLesson) {
           isAlreadyPrepared = true;
         }
      }

      let text = isAlreadyPrepared 
        ? `Đã soạn từ trước đó\nNgày dạy:\n`
        : `Ngày soạn: ${prepDateStr} (${prepDayName})\nNgày dạy:\n`;
        
      sortedClasses.forEach((c: any) => {
         // Lấy danh sách tiết hiện tại trong tuần để xuất text (khi không bật Soạn gộp)
         const actualPeriods = periods.filter(p => {
           const slot = weekData.slots.find((s: any) => s.className === c.className && s.subjectName === group.subjectName && s.lessonNum === p);
           return !!slot;
         });
         
         actualPeriods.forEach(p => {
           text += `- Lớp ${c.className}: ${c.periodMap[p]} (Tiết ${p})\n`;
         });
       });
      
      let htmlTable = isAlreadyPrepared
        ? `<p><strong style="color: red;">Đã soạn từ trước đó</strong></p><p><strong>Ngày dạy:</strong></p>`
        : `<p><strong>Ngày soạn:</strong> ${prepDateStr} (${prepDayName})</p><p><strong>Ngày dạy:</strong></p>`;
      htmlTable += `<table border="1" style="border-collapse: collapse; width: 100%;"><thead><tr><th style="padding: 4px; text-align: center;">Lớp</th>`;
      periods.forEach(p => {
        htmlTable += `<th style="padding: 4px; text-align: center;">Tiết ${p}</th>`;
      });
      htmlTable += `</tr></thead><tbody>`;
      
      sortedClasses.forEach((c: any) => {
        htmlTable += `<tr><td style="text-align: center; padding: 4px;">${c.className}</td>`;
        periods.forEach(p => {
          htmlTable += `<td style="text-align: center; padding: 4px;">${c.periodMap[p] || ""}</td>`;
        });
        htmlTable += `</tr>`;
      });
      
      htmlTable += `<tr><td style="text-align: center; padding: 4px;">Điều chỉnh</td>`;
      periods.forEach(() => { htmlTable += `<td style="padding: 4px;"></td>`; });
      htmlTable += `</tr></tbody></table>`;

      return { ...group, text, htmlTable, periods, sortedClasses, prepDateStr, prepDayName };
    });
  };

  const handleCopy = async (text: string, htmlStr?: string) => {
    try {
      if (htmlStr && navigator.clipboard.write) {
        const blobHtml = new Blob([htmlStr], { type: "text/html" });
        const blobText = new Blob([text], { type: "text/plain" });
        const data = [new ClipboardItem({
            "text/html": blobHtml,
            "text/plain": blobText,
        })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(text);
      }
      alert("Đã copy thành công!");
    } catch (err) {
      alert("Không thể copy. Hãy bôi đen văn bản và copy thủ công.");
    }
  };

  // Helper to build render structure dynamically based on hideEmptyPeriods
  const buildRenderStructure = (weekSlots: any[]) => {
    const structure = [];
    for (const dayOfWeek of [2, 3, 4, 5, 6, 7]) {
      const daySlots = weekSlots.filter(s => s.dayOfWeek === dayOfWeek);
      
      if (hideEmptyPeriods && daySlots.length === 0) continue;
      
      let dayRowsCount = 0;
      const sessionsToRender = [];

      for (const session of ['SANG', 'CHIEU']) {
        const sessionSlotsRaw = daySlots.filter(s => s.session === session);
        
        if (hideEmptyPeriods && sessionSlotsRaw.length === 0) continue;
        
        const periodsToRender = hideEmptyPeriods 
          ? sessionSlotsRaw.map(s => s.period).sort((a,b) => a-b)
          : [1, 2, 3, 4, 5];
          
        sessionsToRender.push({
          session,
          periods: periodsToRender
        });
        dayRowsCount += periodsToRender.length;
      }
      
      if (dayRowsCount > 0) {
        structure.push({
          dayOfWeek,
          dayRowsCount,
          sessions: sessionsToRender
        });
      }
    }
    return structure;
  };



  const handleExportExcel = async () => {
    if (!lbgData || lbgData.weeks.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TKB-LBG Pro";
    workbook.created = new Date();

    for (const weekData of lbgData.weeks) {
      const sheetName = `Tuần ${weekData.weekInfo.weekNumber}`;
      const sheet = workbook.addWorksheet(sheetName, {
        pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0, footer: 0 } },
      });

      // 1. Setup Columns (No Ghi chú)
      sheet.columns = [
        { header: "", key: "day", width: 12 },
        { header: "", key: "session", width: 8 },
        { header: "", key: "period", width: 6 },
        { header: "", key: "subject", width: 22 },
        { header: "", key: "class", width: 8 },
        { header: "", key: "ppct", width: 8 },
        { header: "", key: "lesson", width: 35 },
        { header: "", key: "prep", width: 25 },
      ];

      const getWeekDateRange = (weekInfo: any, slots: any[]) => {
        let actualStartDate = new Date(weekInfo.startDate);
        let actualEndDate = new Date(weekInfo.endDate);
      
        if (slots && slots.length > 0) {
          const minDay = Math.min(...slots.map(s => s.dayOfWeek));
          const maxDay = Math.max(...slots.map(s => s.dayOfWeek));
          
          const startOffset = minDay - 2;
          const endOffset = maxDay - 2;
          
          actualStartDate = new Date(weekInfo.startDate);
          actualStartDate.setDate(actualStartDate.getDate() + startOffset);
          
          actualEndDate = new Date(weekInfo.startDate);
          actualEndDate.setDate(actualEndDate.getDate() + endOffset);
        }
      
        return {
          startDateStr: format(actualStartDate, "dd/MM/yyyy"),
          endDateStr: format(actualEndDate, "dd/MM/yyyy")
        };
      };

      const { startDateStr, endDateStr } = getWeekDateRange(weekData.weekInfo, weekData.slots || []);
      
      const row1 = sheet.addRow(["TRƯỜNG PTDTBT THCS NGHINH TƯỜNG"]);
      sheet.mergeCells(`A${row1.number}:D${row1.number}`);
      const cell1A = sheet.getCell(`A${row1.number}`);
      cell1A.font = { name: "Times New Roman", size: 12, bold: true };
      cell1A.alignment = { horizontal: "left", vertical: "middle" };

      sheet.addRow([]); 

      const titleRow = sheet.addRow([`LỊCH BÁO GIẢNG`]);
      sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`); // A-H is 8 cols
      titleRow.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow.alignment = { horizontal: "center", vertical: "middle" };

      const subTitleRow = sheet.addRow([`Tuần: ${weekData.weekInfo.weekNumber} (Từ ngày ${startDateStr} đến ngày ${endDateStr})`]);
      sheet.mergeCells(`A${subTitleRow.number}:H${subTitleRow.number}`);
      subTitleRow.font = { name: "Times New Roman", size: 12, italic: true };
      subTitleRow.alignment = { horizontal: "center", vertical: "middle" };

      sheet.addRow([]); 

      const teacherRow = sheet.addRow([`Họ và tên giáo viên: ${lbgData.teacherName}`]);
      sheet.mergeCells(`A${teacherRow.number}:H${teacherRow.number}`);
      teacherRow.font = { name: "Times New Roman", size: 13, bold: true, italic: true };
      teacherRow.alignment = { horizontal: "left", vertical: "middle" };

      sheet.addRow([]); 

      // Header Row
      const headerRow = sheet.addRow([
        "Thứ, ngày, buổi", "", "Tiết TKB", "Môn (hoặc PM)", "Lớp", "Tiết PPCT", "Tên bài dạy", "Chuẩn bị, điều chỉnh"
      ]);
      sheet.mergeCells(`A${headerRow.number}:B${headerRow.number}`);
      headerRow.height = 30;
      
      for (let i = 1; i <= 8; i++) {
        const cell = headerRow.getCell(i);
        cell.font = { name: "Times New Roman", size: 12, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" }
        };
      }

      // Generate Data Rows
      const structure = buildRenderStructure(weekData.slots || []);
      
      for (const day of structure) {
        const startRowForDay = sheet.rowCount + 1;

        for (const sessionObj of day.sessions) {
          const startRowForSession = sheet.rowCount + 1;

          for (let pIdx = 0; pIdx < sessionObj.periods.length; pIdx++) {
            const period = sessionObj.periods[pIdx];
            const slot = weekData.slots.find((s: any) => s.dayOfWeek === day.dayOfWeek && s.session === sessionObj.session && s.period === period);
            
            const isFirstOfSession = pIdx === 0;
            const isFirstOfDay = sessionObj === day.sessions[0] && pIdx === 0;

            const dayText = isFirstOfDay ? `${getDayText(day.dayOfWeek)}\n${calculateDateForDay(weekData.weekInfo.startDate, day.dayOfWeek)}` : "";
            const sessionText = isFirstOfSession ? (sessionObj.session === 'SANG' ? 'Sáng' : 'Chiều') : "";

            const row = sheet.addRow([
              dayText,
              sessionText,
              period,
              slot?.subjectName || "",
              slot?.className || "",
              slot?.lessonNum || "",
              slot?.lessonName || "",
              slot?.adjustments || ""
            ]);

            row.eachCell((cell, colNumber) => {
              cell.font = { name: "Times New Roman", size: 12 };
              
              if ([1].includes(colNumber)) {
                cell.font = { name: "Times New Roman", size: 12, bold: true, italic: true };
              }

              // Apply borders
              const isLastPeriod = pIdx === sessionObj.periods.length - 1;
              const isFirstPeriod = pIdx === 0;
              const isLastSession = sessionObj === day.sessions[day.sessions.length - 1];
              
              let bottomStyle: any = "dashed";
              if (isLastPeriod && isLastSession) {
                bottomStyle = "medium";
              } else if (isLastPeriod) {
                bottomStyle = "thin";
              }

              cell.border = {
                top: { style: isFirstPeriod ? "thin" : "dashed" },
                bottom: { style: bottomStyle },
                left: { style: "thin" },
                right: { style: "thin" }
              };
              
              // Alignment
              if ([1, 2, 3, 5, 6].includes(colNumber)) {
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
              } else if ([4].includes(colNumber)) {
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
              } else {
                cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
              }

              // Làm mờ chữ nếu là tiết bị lấp (trừ cột ghi chú)
              if (slot?.isOverridden && colNumber > 2 && colNumber < 8) {
                cell.font = { ...cell.font, color: { argb: 'FF6B7280' }, italic: true }; // Màu xám đậm hơn (Tailwind gray-500)
              }

              // Cột ghi chú luôn màu đỏ
              if (colNumber === 8) {
                cell.font = { ...cell.font, color: { argb: 'FFFF0000' }, italic: true };
              }
            });
          }

          if (sessionObj.periods.length > 1) {
            sheet.mergeCells(`B${startRowForSession}:B${startRowForSession + sessionObj.periods.length - 1}`);
          }
        }

        if (day.dayRowsCount > 1) {
          sheet.mergeCells(`A${startRowForDay}:A${startRowForDay + day.dayRowsCount - 1}`);
        }
      }
      
      if (structure.length === 0) {
        const emptyRow = sheet.addRow(["Không có dữ liệu trong tuần này", "", "", "", "", "", "", ""]);
        sheet.mergeCells(`A${emptyRow.number}:H${emptyRow.number}`);
        emptyRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LBG_${lbgData.teacherName}_${schoolYear}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 flex-1 h-full min-h-0 pb-10">
      
      {/* LEFT SIDEBAR: Controls */}
      <div className="w-full xl:w-52 flex flex-col gap-3 flex-shrink-0 z-20">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-indigo-500" />
            Giáo viên
          </h3>
          {currentUserRole === "GV" ? (
            /* GV xem lịch của mình — không được chọn GV khác */
            <div className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-800 flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span className="truncate">
                {teachers.find(t => t.id === currentUserId)?.name || "Giáo viên của tôi"}
              </span>
            </div>
          ) : (
            /* ADMIN / BGH — chọn bất kỳ GV */
            <select 
              className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="" disabled>-- Chọn Giáo viên --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              Tuần học ({selectedWeeks.length})
            </h3>
          </div>
          
          <button 
            onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
            className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:border-indigo-400 transition-colors"
          >
            <span className="text-gray-700 dark:text-gray-300 truncate">
              {selectedWeeks.length === 0 ? "Chọn tuần..." : `Đã chọn ${selectedWeeks.length} tuần`}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isWeekDropdownOpen && (
            <div className="absolute top-[85px] left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 p-2">
              <div className="flex items-center justify-between mb-2 px-2 py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500">Danh sách</span>
                <button 
                  onClick={selectAllWeeks}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  {selectedWeeks.length === schoolWeeks.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {schoolWeeks.map(w => (
                  <label 
                    key={w.id} 
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedWeeks.includes(w.weekNumber)}
                      onChange={() => toggleWeek(w.weekNumber)}
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedWeeks.includes(w.weekNumber) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-500'}`}>
                      {selectedWeeks.includes(w.weekNumber) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tuần {w.weekNumber}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <input 
            type="checkbox" 
            checked={hideEmptyPeriods}
            onChange={(e) => setHideEmptyPeriods(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Ẩn tiết/ngày trống</span>
        </label>

        <button 
          onClick={handleExportExcel}
          disabled={!lbgData || lbgData.weeks.length === 0 || isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Xuất Excel (Chuẩn)
        </button>
      </div>

      {/* RIGHT AREA: Preview */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-w-0 z-10">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 dark:text-white">Xem trước LBG</h2>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-gray-900/50 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Đang tải dữ liệu LBG...</span>
              </div>
            </div>
          )}

          {!selectedTeacher || selectedWeeks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>Hãy chọn Giáo viên và ít nhất 1 tuần học để xem trước.</p>
            </div>
          ) : (
            <div className="space-y-12 max-w-[1200px] mx-auto">
              {lbgData?.weeks.map(weekData => {
                const getWeekDateRange = (weekInfo: any, slots: any[]) => {
                  let actualStartDate = new Date(weekInfo.startDate);
                  let actualEndDate = new Date(weekInfo.endDate);
                
                  if (slots && slots.length > 0) {
                    const minDay = Math.min(...slots.map(s => s.dayOfWeek));
                    const maxDay = Math.max(...slots.map(s => s.dayOfWeek));
                    
                    const startOffset = minDay - 2;
                    const endOffset = maxDay - 2;
                    
                    actualStartDate = new Date(weekInfo.startDate);
                    actualStartDate.setDate(actualStartDate.getDate() + startOffset);
                    
                    actualEndDate = new Date(weekInfo.startDate);
                    actualEndDate.setDate(actualEndDate.getDate() + endOffset);
                  }
                
                  return {
                    startDateStr: format(actualStartDate, "dd/MM/yyyy"),
                    endDateStr: format(actualEndDate, "dd/MM/yyyy")
                  };
                };
                
                const { startDateStr, endDateStr } = getWeekDateRange(weekData.weekInfo, weekData.slots || []);
                
                const structure = buildRenderStructure(weekData.slots || []);

                return (
                  <React.Fragment key={weekData.weekInfo.weekNumber}>
                    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm p-4 sm:p-8 overflow-hidden" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    
                    {/* Header Report */}
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold uppercase mb-1 text-black dark:text-white tracking-wide">
                        Lịch Báo Giảng Tuần {weekData.weekInfo.weekNumber}
                      </h2>
                      <p className="text-[15px] italic text-black dark:text-white">
                        (Từ ngày {startDateStr} đến ngày {endDateStr})
                      </p>
                    </div>

                    <div className="mb-4">
                      <p className="text-[16px] font-bold text-black dark:text-white">
                        Họ và tên giáo viên: {lbgData.teacherName}
                      </p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-black text-[15px] text-black dark:text-gray-200">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-700/50">
                            <th colSpan={2} className="border border-black border-solid p-2 text-center font-bold">Thứ, ngày, buổi</th>
                            <th className="border border-black border-solid p-2 text-center font-bold">Tiết TKB</th>
                            <th className="border border-black border-solid p-2 text-center font-bold">Môn (hoặc PM)</th>
                            <th className="border border-black border-solid p-2 text-center font-bold">Lớp</th>
                            <th className="border border-black border-solid p-2 text-center font-bold whitespace-nowrap">Tiết PPCT</th>
                            <th className="border border-black border-solid p-2 text-center font-bold">Tên bài dạy</th>
                            <th className="border border-black border-solid p-2 text-center font-bold">Chuẩn bị, điều chỉnh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {structure.length > 0 ? structure.map(day => {
                            const dayDateStr = calculateDateForDay(weekData.weekInfo.startDate, day.dayOfWeek);
                            
                            return (
                              <React.Fragment key={day.dayOfWeek}>
                                {day.sessions.map((sessionObj, sIdx) => {
                                  return sessionObj.periods.map((period, pIdx) => {
                                    const slot = weekData.slots?.find((s: any) => s.dayOfWeek === day.dayOfWeek && s.session === sessionObj.session && s.period === period);
                                    
                                    const isFirstOfSession = pIdx === 0;
                                    const isFirstOfDay = sIdx === 0 && pIdx === 0;
                                    const isLastPeriodOfSession = pIdx === sessionObj.periods.length - 1;
                                    const isLastSessionOfDay = sIdx === day.sessions.length - 1;
                                    const isLastPeriodOfDay = isLastPeriodOfSession && isLastSessionOfDay;
                                    
                                    const dayBgClass = (day.dayOfWeek % 2 === 0) ? "bg-[#fdfdfd] dark:bg-gray-800" : "bg-[#f4f7fb] dark:bg-slate-800/60";

                                    let borderBottomClass = "border-b border-black border-dashed";
                                    if (isLastPeriodOfDay) {
                                      borderBottomClass = "border-b-[3px] border-black border-solid";
                                    } else if (isLastPeriodOfSession) {
                                      borderBottomClass = "border-b-2 border-black border-solid";
                                    }
                                    
                                    const rowStyleClass = slot?.isOverridden 
                                      ? `text-gray-500 dark:text-gray-400 opacity-90 ${dayBgClass}` 
                                      : `hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors ${dayBgClass}`;

                                    return (
                                      <tr key={`${day.dayOfWeek}-${sessionObj.session}-${period}`} className={rowStyleClass}>
                                        {isFirstOfDay && (
                                          <td rowSpan={day.dayRowsCount} className={`border border-black border-solid border-b-[3px] p-2 text-center font-bold text-lg align-middle w-[100px] text-black dark:text-gray-200 opacity-100 ${dayBgClass}`}>
                                            <div className="italic">{getDayText(day.dayOfWeek)}</div>
                                            <div className="text-[13px] font-normal not-italic">{dayDateStr}</div>
                                          </td>
                                        )}
                                        {isFirstOfSession && (
                                          <td rowSpan={sessionObj.periods.length} className={`border border-black border-solid ${isLastSessionOfDay ? 'border-b-[3px]' : 'border-b-2'} p-1 text-center font-medium align-middle w-[60px] text-black dark:text-gray-200 opacity-100 ${dayBgClass}`}>
                                            {sessionObj.session === 'SANG' ? 'Sáng' : 'Chiều'}
                                          </td>
                                        )}
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-1 text-center`}>{period}</td>
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-1 text-center font-medium`}>{slot?.subjectName || ""}</td>
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-1 text-center font-medium`}>{slot?.className || ""}</td>
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-1 text-center`}>{slot?.lessonNum || ""}</td>
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-2 text-left ${slot?.isOverridden ? 'italic' : ''}`}>{slot?.lessonName || ""}</td>
                                        <td className={`border-l border-r border-black border-solid ${borderBottomClass} p-1 text-left text-sm text-red-600 dark:text-red-400 italic`}>
                                          {slot?.adjustments || ""}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })}
                              </React.Fragment>
                            )
                          }) : (
                            <tr>
                              <td colSpan={8} className="border border-black p-4 text-center italic text-gray-500">
                                Không có tiết dạy trong tuần này.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Lesson Plan Info Section */}
                  <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col mb-4 gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Copy className="w-5 h-5 text-indigo-500" />
                          Trích xuất Ngày dạy, Ngày soạn kế hoạch
                        </h3>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setShowLessonPlan(!showLessonPlan)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                          >
                            <EyeOff className="w-4 h-4" />
                            {showLessonPlan ? "Ẩn" : "Hiện"}
                          </button>
                          
                          {showLessonPlan && (
                            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <input
                                type="checkbox"
                                checked={isGroupedPlan}
                                onChange={(e) => setIsGroupedPlan(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-gray-100 border-gray-300"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Soạn gộp (Bảng)
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Hệ thống tự động gom nhóm các lớp học chung một bài dạy để bạn dễ dàng sao chép vào Giáo án.
                      </p>
                    </div>
                    
                    {showLessonPlan && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {generateLessonPlanInfo(weekData, isGroupedPlan).map((group, idx) => (
                          <div key={idx} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col shadow-sm ${isGroupedPlan ? 'col-span-1 md:col-span-2 lg:col-span-3' : ''}`}>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                              <div className="truncate font-semibold text-indigo-900 dark:text-indigo-200 text-sm" title={`${group.subject} - ${group.lessonName}`}>
                                {group.subject} <br/>
                                <span className="text-xs font-normal opacity-80 truncate block">
                                  {group.lessonName}
                                  {group.periods.length > 0 && ` (Tiết ${group.periods.join(", ")})`}
                                </span>
                              </div>
                              <button 
                                onClick={() => handleCopy(group.text, isGroupedPlan ? group.htmlTable : undefined)}
                                className="px-3 py-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-md text-indigo-600 dark:text-indigo-300 transition-colors flex items-center gap-1 flex-shrink-0 ml-2 border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800"
                                title="Copy văn bản"
                              >
                                <Copy className="w-4 h-4" />
                                <span className="text-xs font-medium">Copy</span>
                              </button>
                            </div>
                            <div className="p-4 flex-1 overflow-x-auto">
                              {isGroupedPlan ? (
                                <div className="text-sm text-gray-700 dark:text-gray-300 font-sans" dangerouslySetInnerHTML={{ __html: group.htmlTable }} />
                              ) : (
                                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                                  {group.text}
                                </pre>
                              )}
                            </div>
                          </div>
                        ))}
                      {generateLessonPlanInfo(weekData, isGroupedPlan).length === 0 && (
                        <div className="col-span-full text-center py-6 text-gray-500 italic">
                          Không có dữ liệu bài dạy.
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  </React.Fragment>
              );
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
