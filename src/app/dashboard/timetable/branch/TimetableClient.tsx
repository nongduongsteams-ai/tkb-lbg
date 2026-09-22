'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toPng } from 'html-to-image';
import { useRouter } from 'next/navigation';
import { saveTimetableSlot, deleteTimetableSlot, rolloverWeek, bulkDeleteSlots, BulkDeleteMode, saveTimetableNote, importTimetableFromJSON, syncAllWeekPPCT, saveTimetableCellNote, deleteTimetableCellNote } from '@/actions/timetable';

export default function TimetableClient({ weekNumber, schoolYear, schoolWeek, classes, assignments, slots: initialSlots, stats: initialStats, timetableNotes = [], timetableCellNotes = [], branch = 'Phân hiệu', level = 'ALL', readOnly = false, userRole, currentUserId }: any) {
  const router = useRouter();

  // ─── Local state — cập nhật ngay, không chờ server ──────────────────
  const [localSlots, setLocalSlots] = useState<any[]>(initialSlots);
  const [localStats, setLocalStats] = useState<any[]>(initialStats);
  const [localCellNotes, setLocalCellNotes] = useState<any[]>(timetableCellNotes);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [rolloverPending, setRolloverPending] = useState(false);
  const [isNavigatingWeek, setIsNavigatingWeek] = useState(false);

  // Bulk delete state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<BulkDeleteMode>('week');
  const [bulkFilterId, setBulkFilterId] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<'ALL' | 'NORMAL' | 'SUBSTITUTE'>('ALL');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Import JSON state
  const [showImportAIModal, setShowImportAIModal] = useState(false);
  const [importJSONText, setImportJSONText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Substitute modal state
  const [pendingSubstitute, setPendingSubstitute] = useState<{
    day: number, period: number, session: 'SANG' | 'CHIEU', classId: string, assignmentId: string
  } | null>(null);
  const [substituteType, setSubstituteType] = useState<'LAP_GIO' | 'DAY_THAY'>('DAY_THAY');
  const [substituteNote, setSubstituteNote] = useState('');
  const [customSubstituteName, setCustomSubstituteName] = useState('');

  // Đồng bộ khi props thay đổi (chuyển tuần)
  useEffect(() => {
    setLocalSlots(initialSlots);
    setLocalStats(initialStats);
    setIsNavigatingWeek(false);
  }, [initialSlots, initialStats, weekNumber]);

  const [showT, setShowT] = useState(true);
  const [showHK1, setShowHK1] = useState(true);
  const [showHK2, setShowHK2] = useState(false);
  const [showCN, setShowCN] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<{ type: 'subject' | 'teacher', value: string } | null>(null);
  const [lockedItem, setLockedItem] = useState<{ type: 'subject' | 'teacher', value: string } | null>(null);

  const toggleLockItem = useCallback((type: 'subject' | 'teacher', value: string) => {
    setLockedItem(prev => {
      if (prev?.type === type && prev?.value === value) return null;
      return { type, value };
    });
  }, []);

  // New UI states
  const [hideSaturday, setHideSaturday] = useState(() => {
    return !initialSlots.some((s: any) => s.dayOfWeek === 7);
  });
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [showPeriod5, setShowPeriod5] = useState(false);
  const [showPeriodNumber, setShowPeriodNumber] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [colors, setColors] = useState({
    subject: '#1e40af',
    period: '#e11d48',
    teacher: '#4b5563',
    watermark: '#cbd5e1',
    substitute: '#b45309',
    overridden: '#9ca3af'
  });
  const [showColorSettings, setShowColorSettings] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [exportMode, setExportMode] = useState<'IDLE' | 'FULL' | 'CLEAN' | 'DETAIL'>('IDLE');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tkbColors');
    if (saved) setColors(JSON.parse(saved));
  }, []);

  const updateColor = (key: keyof typeof colors, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);
    localStorage.setItem('tkbColors', JSON.stringify(newColors));
  };

  
  
  
  
  
  const handleSyncPPCT = async () => {
    if (!confirm('Bạn có chắc muốn rà soát và đồng bộ lại toàn bộ PPCT cho tuần ' + weekNumber + '? (Quá trình này có thể mất vài giây)')) return;
    setIsSyncing(true);
    try {
      const classIds = classes.map((c: any) => c.id);
      const res = await syncAllWeekPPCT(weekNumber, schoolYear, classIds);
      if (res.success) {
        alert('Đồng bộ PPCT thành công!');
        // Giao diện sẽ tự động revalidatePath nên data mới sẽ về
      } else {
        alert('Lỗi: ' + res.error);
      }
    } catch (e: any) {
      alert('Lỗi kết nối');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    setTimeout(async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ThoiKhoaBieu');

      // Setup trang in
      worksheet.pageSetup = {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.1, footer: 0.1 }
      };

      // 1. Header
      const headers = ['Thứ', 'Buổi', 'Tiết'];
      classes.forEach((c: any) => {
         headers.push(c.name);
         headers.push('ĐC');
      });
      headers.push('Ghi chú');
      
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell: any) => {
         cell.font = { bold: true };
         cell.alignment = { vertical: 'middle', horizontal: 'center' };
         cell.border = {
           top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
         };
      });

      let currentRowNum = 2;

      days.forEach(day => {
        const dayName = day === 8 ? 'Chủ Nhật' : (day === 2 ? 'Hai' : (day === 3 ? 'Ba' : (day === 4 ? 'Tư' : (day === 5 ? 'Năm' : (day === 6 ? 'Sáu' : (day === 7 ? 'Bảy' : ''))))));
        
        const getVisiblePeriods = (sessionStr: string) => {
           const currentPeriods = (sessionStr === 'SANG' && showPeriod5) ? [1, 2, 3, 4, 5] : periods;
           if (!hideEmptyRows) return currentPeriods;
           let vPeriods = currentPeriods.filter(p => !classes.every((cls: any) => !getSlot(day, p, sessionStr, cls.id, 'NORMAL') && !getSlot(day, p, sessionStr, cls.id, 'SUBSTITUTE')));
           if (vPeriods.length === 0 && sessionStr === 'CHIEU') {
             const note = timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === sessionStr)?.content || '';
             if (note.trim().length > 0) vPeriods = [1];
           }
           return vPeriods;
        };

        const visibleSessions = sessions.filter(s => getVisiblePeriods(s).length > 0);
        if (visibleSessions.length === 0) return;

        let dayStartRow = currentRowNum;

        visibleSessions.forEach(session => {
           const visiblePeriods = getVisiblePeriods(session);
           let sessionStartRow = currentRowNum;

           visiblePeriods.forEach((period, pIdx) => {
             const rowData: any[] = [];
             rowData.push(dayName);
             rowData.push(session === 'SANG' ? 'Sáng' : 'Chiều');
             rowData.push(`Tiết ${period}`);

             classes.forEach((cls: any) => {
                const normalSlot = getSlot(day, period, session, cls.id, 'NORMAL');
                const subSlot = getSlot(day, period, session, cls.id, 'SUBSTITUTE');
                const activeSlot = subSlot || normalSlot;
                
                if (activeSlot) {
                   const subjectName = formatSubjectName(activeSlot.assignment.subject.name);
                   const teacherName = activeSlot.assignment.teacher.shortName || activeSlot.assignment.teacher.name;
                   rowData.push(`${subjectName} - ${teacherName}`);
                } else {
                   rowData.push('');
                }
                rowData.push(''); 
             });

             if (pIdx === 0) {
               const note = timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === session)?.content || '';
               rowData.push(note);
             } else {
               rowData.push('');
             }

             const row = worksheet.addRow(rowData);
             // set a fixed height for wrapping text
             row.eachCell((cell: any) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                  top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
             });
             currentRowNum++;
           });

           if (currentRowNum - 1 > sessionStartRow) {
             worksheet.mergeCells(sessionStartRow, 2, currentRowNum - 1, 2);
             worksheet.mergeCells(sessionStartRow, headers.length, currentRowNum - 1, headers.length);
           }
        });

        if (currentRowNum - 1 > dayStartRow) {
           worksheet.mergeCells(dayStartRow, 1, currentRowNum - 1, 1);
        }
      });

      worksheet.getColumn(1).width = 10;
      worksheet.getColumn(2).width = 10;
      worksheet.getColumn(3).width = 10;
      for (let i = 4; i < headers.length; i += 2) {
         worksheet.getColumn(i).width = 18;
         worksheet.getColumn(i+1).width = 5;
      }
      worksheet.getColumn(headers.length).width = 20;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `TKB_Tuan_${weekNumber}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Có lỗi xảy ra khi tạo Excel. Vui lòng thử lại.');
    } finally {
      setIsExportingExcel(false);
    }
    }, 50);
  };
const handleExportPNG = async (mode: 'FULL' | 'CLEAN' | 'DETAIL' = 'FULL') => {
    setExportMode(mode);
    setTimeout(async () => {
      if (!tableRef.current) {
        setExportMode('IDLE');
        return;
      }
      try {
        const dataUrl = await toPng(tableRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          skipFonts: true,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
        });
        const link = document.createElement('a');
        link.download = `TKB_Tuan_${weekNumber}${mode === 'CLEAN' ? '_TieuChuan' : mode === 'DETAIL' ? '_ChiTiet' : '_NangCao'}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Lỗi khi xuất ảnh:', error);
        alert('Có lỗi xảy ra khi xuất ảnh. Vui lòng thử lại.');
      } finally {
        setExportMode('IDLE');
      }
    }, 150);
  };

  // Drag-to-scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Không kích hoạt kéo thả nếu người dùng đang bấm vào các trường nhập liệu hoặc nút
    if (['SELECT', 'TEXTAREA', 'INPUT', 'BUTTON'].includes(target.tagName)) return;
    
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    startPos.current = {
      x: e.pageX - scrollContainerRef.current.offsetLeft,
      y: e.pageY - scrollContainerRef.current.offsetTop,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop
    };
    scrollContainerRef.current.classList.add('cursor-grabbing');
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.classList.remove('cursor-grabbing');
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.classList.remove('cursor-grabbing');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startPos.current.x) * 1.5;
    const walkY = (y - startPos.current.y) * 1.5;
    scrollContainerRef.current.scrollLeft = startPos.current.scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = startPos.current.scrollTop - walkY;
  };
  const getDayDate = useCallback((weekNum: number, dayOfWeek: number) => {
    let baseDate: Date;
    if (schoolWeek?.startDate) {
      baseDate = new Date(schoolWeek.startDate);
    } else {
      baseDate = new Date(2025, 8, 1); // 1 Sept 2025 is Monday
      baseDate = new Date(baseDate.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    }
    const targetDate = new Date(baseDate.getTime() + (dayOfWeek - 2) * 24 * 60 * 60 * 1000);
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const yyyy = targetDate.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, [schoolWeek]);

  const weekStartStr = schoolWeek?.startDate ? new Date(schoolWeek.startDate).toLocaleDateString('vi-VN') : '...';
  
  const maxActiveDay = useMemo(() => {
    let max = 2; // Default to Monday
    for (const slot of localSlots) {
       if (slot.dayOfWeek > max) max = slot.dayOfWeek;
    }
    for (const note of timetableNotes || []) {
       if (note.dayOfWeek > max) max = note.dayOfWeek;
    }
    if (hideSaturday && max > 6) max = 6;
    if (max > 7) max = 7;
    return max;
  }, [localSlots, timetableNotes, hideSaturday]);

  const weekEndStr = useMemo(() => {
    if (!schoolWeek?.startDate) return '...';
    const baseDate = new Date(schoolWeek.startDate);
    const targetDate = new Date(baseDate.getTime() + (maxActiveDay - 2) * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('vi-VN');
  }, [schoolWeek, maxActiveDay]);

  const days = hideSaturday ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7];
  const periods = [1, 2, 3, 4];
  const sessions = ['SANG', 'CHIEU'];

  const formatSubjectName = (name: string) => {
    if (!name) return '';
    const map: Record<string, string> = {
      'Ngữ văn': 'Văn',
      'Ngoại ngữ 1': 'Anh',
      'Khoa học tự nhiên (Sinh)': 'KHTN(Sinh)',
      'Khoa học tự nhiên (Hóa)': 'KHTN(Hóa)',
      'Khoa học tự nhiên (Lý)': 'KHTN(Lý)',
      'Lịch sử và Địa lí (Sử)': 'LS&ĐL(Sử)',
      'Lịch sử và Địa lí (Địa)': 'LS&ĐL(Địa)',
      'Nghệ thuật (Âm nhạc)': 'NT(Nhạc)',
      'Nghệ thuật (Mĩ thuật)': 'NT(MT)',
      'HĐTN, HN (Chào cờ)': 'HĐTNHN (CC)',
      'HĐTN, HN (TN CĐ)': 'HĐTNHN (CĐ)',
      'HĐTN, HN (Sinh hoạt lớp)': 'HĐTNHN (SH)',
      'Công nghệ': 'CN',
      'Tin học': 'Tin',
      'Giáo dục công dân': 'GDCD',
      'Giáo dục thể chất': 'GDTC',
      'Giáo dục địa phương': 'GDĐP'
    };
    return map[name] || name;
  };

  const slotMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of localSlots) {
      if (s.assignment?.classId) {
        map.set(`${s.dayOfWeek}-${s.period}-${s.session}-${s.assignment.classId}-${s.status}`, s);
      }
    }
    return map;
  }, [localSlots]);

  const getSlot = useCallback((day: number, period: number, session: string, classId: string, status: 'NORMAL' | 'SUBSTITUTE' = 'NORMAL') => {
    return slotMap.get(`${day}-${period}-${session}-${classId}-${status}`);
  }, [slotMap]);

  // Danh sách các tiết thực tế (không tính tiết bị đè)
  const activeLocalSlots = useMemo(() => {
    const subSet = new Set<string>();
    for (const s of localSlots) {
      if (s.status === 'SUBSTITUTE' && s.assignment?.classId) {
        subSet.add(`${s.dayOfWeek}-${s.period}-${s.session}-${s.assignment.classId}`);
      }
    }
    return localSlots.filter((s: any) => {
      if (s.status === 'NORMAL') {
        if (subSet.has(`${s.dayOfWeek}-${s.period}-${s.session}-${s.assignment?.classId}`)) return false;
      }
      return true;
    });
  }, [localSlots]);

  const doubleBookedSlotIds = useMemo(() => {
    const ids = new Set<string>();
    const map = new Map<string, string[]>(); 
    
    for (const s of activeLocalSlots) {
       if (!s.assignment?.teacher?.id) continue;
       const key = `${s.dayOfWeek}-${s.session}-${s.period}-${s.assignment.teacher.id}`;
       if (!map.has(key)) map.set(key, []);
       map.get(key)!.push(s.id);
    }
    
    for (const slots of map.values()) {
       if (slots.length > 1) {
          slots.forEach(id => ids.add(id));
       }
    }
    return ids;
  }, [activeLocalSlots]);
  // Tính số thứ tự tiết của môn trong tuần
  const periodNumMap = useMemo(() => {
    const map = new Map<string, number>();
    const byAssignment = new Map<string, any[]>();
    
    const subSet = new Set<string>();
    for (const s of activeLocalSlots) {
      if (s.status === 'SUBSTITUTE' && s.assignment?.classId) {
        subSet.add(----);
      }
    }

    for (const s of activeLocalSlots) {
      if (s.weekNumber === weekNumber) {
        if (s.isOriginal && s.status !== 'SUBSTITUTE' && s.assignment?.classId) {
          if (subSet.has(----)) {
            continue;
          }
        }
        if (!byAssignment.has(s.assignmentId)) byAssignment.set(s.assignmentId, []);
        byAssignment.get(s.assignmentId)!.push(s);
      }
    }
    for (const slots of byAssignment.values()) {
      slots.sort((a: any, b: any) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
        return a.period - b.period;
      });
      slots.forEach((s: any, idx: number) => {
        map.set(s.id, idx + 1);
      });
    }
    return map;
  }, [activeLocalSlots, weekNumber]);

  const getPeriodNumInWeek = useCallback((slotId: string, _assignmentId?: string) => {
    return periodNumMap.get(slotId) || null;
  }, [periodNumMap]);

  /**
   * Tự động tính toán lại số tiết PPCT (actualLessonNum) và autoLessonNum cho các slot local
   * khi có hành động thêm/xóa tiết ở client mà không cần chờ server.
   */
  const recalculateLocalPPCT = useCallback((allSlots: any[], targetAssignmentId: string) => {
    const targetSlots = allSlots.filter((s: any) => s.assignmentId === targetAssignmentId && s.status !== 'CANCELLED');

    const subSet = new Set<string>();
    for (const s of allSlots) {
      if (s.status === 'SUBSTITUTE' && s.assignment?.classId) {
        subSet.add(`${s.weekNumber}-${s.dayOfWeek}-${s.session}-${s.period}-${s.assignment.classId}`);
      }
    }
    
    const overriddenSlotIds = new Set<string>();
    for (const s of allSlots) {
      if (s.status === 'NORMAL' && s.assignment?.classId) {
        if (subSet.has(`${s.weekNumber}-${s.dayOfWeek}-${s.session}-${s.period}-${s.assignment.classId}`)) {
          overriddenSlotIds.add(s.id);
        }
      }
    }

    const validSlots = targetSlots.filter((s: any) => !overriddenSlotIds.has(s.id));

    validSlots.sort((a: any, b: any) => {
      if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber;
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
      return a.period - b.period;
    });

    
    const existingNums = targetSlots
      .map((s: any) => s.teachingSchedules?.[0]?.actualLessonNum || periodNumMap.get(s.id))
      .filter((n: any) => n != null);
    let currentLessonNum = existingNums.length > 0 ? Math.min(...existingNums) : 1;
    const updatedSlotMap = new Map<string, { actualLessonNum: number; autoLessonNum: number }>();

    for (const slot of validSlots) {
      const ts = slot.teachingSchedules?.[0];
      const hasManualOverride = ts?.isManualOverride;
      const isProgression = ts?.isProgression;

      if (hasManualOverride) {
        if (isProgression) {
          const autoNum = ts.autoLessonNum || currentLessonNum;
          const offset = (ts.actualLessonNum || autoNum) - autoNum;
          const newActualLessonNum = currentLessonNum + offset;
          const lessonNumber = currentLessonNum;
          currentLessonNum = newActualLessonNum + 1;
          updatedSlotMap.set(slot.id, { actualLessonNum: newActualLessonNum, autoLessonNum: lessonNumber });
        } else {
          const lessonNumber = currentLessonNum;
          currentLessonNum++;
          updatedSlotMap.set(slot.id, { actualLessonNum: ts.actualLessonNum, autoLessonNum: lessonNumber });
        }
      } else {
        const lessonNumber = currentLessonNum;
        currentLessonNum++;
        updatedSlotMap.set(slot.id, { actualLessonNum: lessonNumber, autoLessonNum: lessonNumber });
      }
    }

    return allSlots.map((s: any) => {
      if (updatedSlotMap.has(s.id)) {
        const update = updatedSlotMap.get(s.id)!;
        const ts = s.teachingSchedules?.[0] || {};
        return {
          ...s,
          teachingSchedules: [
            {
              ...ts,
              actualLessonNum: update.actualLessonNum,
              autoLessonNum: update.autoLessonNum,
            }
          ]
        };
      }
      return s;
    });
  }, []);

  // ─── Gán tiết ──────────────────────────────────────────────────────
  const handleAssign = useCallback((day: number, period: number, session: string, classId: string, assignmentId: string, status: 'NORMAL' | 'SUBSTITUTE' = 'NORMAL') => {
    if (readOnly) return; // GV không được sửa TKB
    if (!assignmentId) return;

    const assignment = assignments.find((a: any) => a.id === assignmentId);
    if (!assignment) return;

    const teacherId = assignment.teacher.id;
    const conflictingSlots = activeLocalSlots.filter(s => 
      s.dayOfWeek === day && 
      s.period === period && 
      s.session === session && 
      s.assignment?.teacher?.id === teacherId &&
      s.assignment?.classId !== classId
    );

    if (conflictingSlots.length > 0) {
      const classesConflict = conflictingSlots.map(s => {
        const cls = classes.find((c: any) => c.id === s.assignment.classId);
        return cls?.name || 'Không rõ';
      }).join(', ');
      
      if (!confirm(`Giáo viên ${assignment.teacher.name} đã được phân công dạy ở lớp ${classesConflict} vào thời điểm này. Bạn có chắc chắn muốn tiếp tục xếp trùng?`)) {
        return;
      }
    }

    const cellKey = `${day}-${session}-${period}-${classId}-${status}`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    // Cập nhật Optimistic UI tức thì (0ms) + tự động tính lại số tiết PPCT
    setLocalSlots(prevSlots => {
      const existingSlot = prevSlots.find((s: any) => 
        s.dayOfWeek === day && s.period === period && s.session === session && s.assignment?.classId === classId && s.status === status
      );
      
      const oldAssignmentId = existingSlot?.assignmentId;
      const tempSlotId = existingSlot ? existingSlot.id : 'temp-' + Date.now();

      const newSlot = {
        id: tempSlotId,
        assignmentId,
        weekNumber,
        dayOfWeek: day,
        period,
        session,
        status,
        schoolYear: '2026-2027',
        assignment,
        teachingSchedules: [
          {
            id: 'temp-ts-' + Date.now(),
            timetableSlotId: tempSlotId,
            weekNumber,
            actualLessonNum: 0,
            actualLessonName: 'Chưa cập nhật tên bài',
            isManualOverride: false,
            isProgression: false,
          }
        ]
      };

      let nextSlots = existingSlot
        ? prevSlots.map((s: any) => s.id === existingSlot.id ? newSlot : s)
        : [...prevSlots, newSlot];

      nextSlots = recalculateLocalPPCT(nextSlots, assignmentId);
      if (oldAssignmentId && oldAssignmentId !== assignmentId) {
        nextSlots = recalculateLocalPPCT(nextSlots, oldAssignmentId);
      }
      return nextSlots;
    });

    // Gọi server ngầm
    saveTimetableSlot(assignmentId, weekNumber, day, period, session as any, '2026-2027', status)
      .then(res => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
        if (!res.success) {
          alert('Lỗi khi lưu: ' + res.error);
          setLocalSlots(initialSlots);
        }
      })
      .catch(() => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
        alert('Lỗi kết nối. Vui lòng thử lại.');
        setLocalSlots(initialSlots);
      });
  }, [assignments, weekNumber, initialSlots, recalculateLocalPPCT]);

  // ─── Xóa tiết ───────────────────────────────────────────────────────
  const handleDelete = useCallback((slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return; // GV không được xóa tiết

    const deletedSlot = localSlots.find((s: any) => s.id === slotId);
    if (!deletedSlot) return;

    const cellKey = `${deletedSlot.dayOfWeek}-${deletedSlot.session}-${deletedSlot.period}-${deletedSlot.assignment.classId}-${deletedSlot.status}`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    // Cập nhật Optimistic UI tức thì (0ms) + tự động dịch chuyển số tiết PPCT nối tiếp
    setLocalSlots(prevSlots => {
      let nextSlots = prevSlots.filter((s: any) => s.id !== slotId);
      nextSlots = recalculateLocalPPCT(nextSlots, deletedSlot.assignmentId);
      return nextSlots;
    });

    // Gọi server ngầm
    deleteTimetableSlot(slotId)
      .then(res => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
        if (!res.success) {
          alert('Lỗi khi xóa: ' + res.error);
          setLocalSlots(initialSlots);
        }
      })
      .catch(() => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
        alert('Lỗi kết nối. Vui lòng thử lại.');
        setLocalSlots(initialSlots);
      });
  }, [localSlots, initialSlots, recalculateLocalPPCT]);

  // ─── Xử lý Ghi chú ô ────────────────────────────────────────────────
  const handleSaveCellNote = useCallback((day: number, period: number, session: string, classId: string, content: string) => {
    if (readOnly || !content.trim()) return;
    const cellKey = `${day}-${session}-${period}-${classId}-NOTE`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    setLocalCellNotes(prev => {
      const next = [...prev.filter(n => !(n.classId === classId && n.dayOfWeek === day && n.period === period && n.session === session))];
      next.push({ classId, dayOfWeek: day, period, session, content });
      return next;
    });

    saveTimetableCellNote(classId, weekNumber, day, period, session as any, schoolYear, content)
      .finally(() => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      });
  }, [readOnly, weekNumber, schoolYear]);

  const handleDeleteCellNote = useCallback((day: number, period: number, session: string, classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    const cellKey = `${day}-${session}-${period}-${classId}-NOTE`;
    setSavingCells(prev => new Set(prev).add(cellKey));

    setLocalCellNotes(prev => prev.filter(n => !(n.classId === classId && n.dayOfWeek === day && n.period === period && n.session === session)));

    deleteTimetableCellNote(classId, weekNumber, day, period, session as any, schoolYear)
      .finally(() => {
        setSavingCells(prev => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      });
  }, [readOnly, weekNumber, schoolYear]);

  // ─── Rollover tuần ──────────────────────────────────────────────────
  const handleRollover = useCallback(() => {
    if (!confirm(`Chép toàn bộ TKB tuần ${weekNumber} sang tuần ${weekNumber + 1}?\nDữ liệu tuần ${weekNumber + 1} (nếu có) sẽ bị ghi đè.`)) return;

    setRolloverPending(true);
    rolloverWeek(weekNumber, weekNumber + 1, '2026-2027', branch, level)
      .then(res => {
        if (res.success) {
          router.push(`/dashboard/timetable/branch?week=${weekNumber + 1}`);
        } else {
          setRolloverPending(false);
          alert('Lỗi: ' + res.error);
        }
      })
      .catch(() => {
        setRolloverPending(false);
        alert('Lỗi kết nối.');
      });
  }, [weekNumber, router]);

  // ─── Bulk Delete ─────────────────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    const needsId = bulkDeleteMode === 'class' || bulkDeleteMode === 'subject' || bulkDeleteMode === 'teacher';
    if (needsId && !bulkFilterId) {
      alert('Vui lòng chọn ' + (bulkDeleteMode === 'class' ? 'lớp' : bulkDeleteMode === 'subject' ? 'môn học' : 'giáo viên') + ' cần xóa.');
      return;
    }

    const modeLabel = {
      week: `toàn bộ tiết Tuần ${weekNumber}`,
      class: `tiết của lớp đã chọn trong Tuần ${weekNumber}`,
      subject: `tiết của môn đã chọn trong Tuần ${weekNumber}`,
      teacher: `tiết của GV đã chọn trong Tuần ${weekNumber}`,
    }[bulkDeleteMode];

    if (!confirm(`Bạn có chắc chắn muốn xóa ${modeLabel}?\nHành động này không thể hoàn tác!`)) return;

    setIsBulkDeleting(true);
    const res = await bulkDeleteSlots(
      bulkDeleteMode,
      weekNumber,
      '2026-2027',
      branch,
      bulkFilterId || undefined,
      bulkStatus,
      level
    );
    setIsBulkDeleting(false);

    if (res.success) {
      alert(res.message || `Đã xóa ${res.deleted} tiết thành công!`);
      setShowBulkDeleteModal(false);
      // Refresh lại trang để lấy dữ liệu mới nhất từ server
      router.refresh();
    } else {
      alert('Lỗi: ' + res.error);
    }
  }, [bulkDeleteMode, bulkFilterId, bulkStatus, weekNumber, router]);

  // ─── Import JSON ─────────────────────────────────────────────────────
  const handleImportJSON = useCallback(async () => {
    if (!importJSONText.trim()) {
      alert('Vui lòng dán nội dung JSON vào ô nhập liệu.');
      return;
    }

    let parsedData = [];
    try {
      parsedData = JSON.parse(importJSONText);
      if (!Array.isArray(parsedData)) {
        throw new Error('Dữ liệu JSON phải là một mảng (Array).');
      }
    } catch (e: any) {
      alert('Lỗi phân tích JSON: ' + e.message);
      return;
    }

    setIsImporting(true);
    setImportResults(null);
    const res = await importTimetableFromJSON(parsedData, weekNumber, '2026-2027', branch, level);
    setIsImporting(false);

    if (res.success) {
      setImportResults(res);
      // Xóa chữ nếu thành công hết, nếu có lỗi thì giữ lại để user xem
      if (res.skipCount === 0) {
        setImportJSONText('');
      }
      router.refresh();
    } else {
      alert('Lỗi hệ thống khi import: ' + res.error);
    }
  }, [importJSONText, weekNumber, router]);

  // Derive unique subjects and teachers from assignments for filter dropdowns
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    assignments.forEach((a: any) => {
      if (!map.has(a.subject.id)) map.set(a.subject.id, { id: a.subject.id, name: a.subject.name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [assignments]);

  const uniqueTeachers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    assignments.forEach((a: any) => {
      if (!map.has(a.teacher.id)) map.set(a.teacher.id, { id: a.teacher.id, name: a.teacher.name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [assignments]);

  // ─── Stats: tính lại client-side khi localSlots thay đổi ────────────
  const derivedStats = localStats.map((classStat: any) => ({
    ...classStat,
    subjects: classStat.subjects.map((subj: any) => {
      const clsObj = classes.find((c: any) => c.name === classStat.className);
      if (!clsObj) return subj;
      const clsAssignments = assignments.filter((a: any) => a.classId === clsObj.id && a.subject.name === subj.subjectName);
      const assignmentIds = clsAssignments.map((a: any) => a.id);
      const subjSlots = activeLocalSlots.filter((s: any) => assignmentIds.includes(s.assignmentId));
      const scheduledWeek = subjSlots.filter((s: any) => s.weekNumber === weekNumber).length;
      const diff = scheduledWeek - subj.scheduledWeek;
      
      const scheduledHk1 = subj.scheduledHk1 + (weekNumber <= 18 ? diff : 0);
      const scheduledHk2 = subj.scheduledHk2 + (weekNumber > 18 ? diff : 0);
      const scheduledYear = subj.scheduledYear + diff;

      return {
        ...subj,
        scheduledWeek,
        scheduledHk1,
        scheduledHk2,
        scheduledYear,
        status: scheduledWeek === subj.planWeek ? 'green' : (scheduledWeek < subj.planWeek ? 'red' : 'yellow'),
      };
    }),
  }));

  // ─── Derive master subjects list ─────────────────────────────────────
  const subjectMaxPlanWeek: Record<string, number> = {};
  derivedStats.forEach((classStat: any) => {
    classStat.subjects.forEach((subj: any) => {
      subjectMaxPlanWeek[subj.subjectName] = Math.max(subjectMaxPlanWeek[subj.subjectName] || 0, subj.planWeek);
    });
  });
  let masterSubjectsList = Object.keys(subjectMaxPlanWeek).sort((a, b) => {
    const planDiff = subjectMaxPlanWeek[b] - subjectMaxPlanWeek[a];
    if (planDiff !== 0) return planDiff;
    return a.localeCompare(b, 'vi');
  });

  const gvAssignedMap = new Set<string>();
  if (userRole === 'GV' && currentUserId) {
    const gvSubjects = new Set<string>();
    assignments.forEach((a: any) => {
      if (a.teacherId === currentUserId) {
        gvSubjects.add(a.subject.name);
        gvAssignedMap.add(`${a.subject.name}-${a.classId}`);
      }
    });
    masterSubjectsList = masterSubjectsList.filter(s => gvSubjects.has(s));
  }

  return (
    <div className="flex flex-col gap-6 text-gray-900 dark:text-gray-200">
      <style>{`
        .dark .dark\\:bg-gray-800 { background-color: #1f2937 !important; }
        .dark .dark\\:bg-gray-700 { background-color: #374151 !important; }
        .dark .dark\\:bg-gray-900\\/50 { background-color: rgba(17, 24, 39, 0.5) !important; }
        .dark .dark\\:bg-gray-900\\/30 { background-color: rgba(17, 24, 39, 0.3) !important; }
        .dark .dark\\:bg-blue-900\\/30 { background-color: rgba(30, 58, 138, 0.3) !important; }
        .dark .dark\\:border-gray-700 { border-color: #374151 !important; }
        .dark .dark\\:border-gray-600 { border-color: #4b5563 !important; }
        .dark .dark\\:text-white { color: #ffffff !important; }
        @keyframes pulse-border { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .saving-cell { animation: pulse-border 1s ease-in-out infinite; }
      `}</style>

      {/* ─── Bulk Delete Modal ─── */}
      {showBulkDeleteModal && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setShowBulkDeleteModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              width: '100%', maxWidth: 520, padding: '32px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>🗑️ Xóa hàng loạt</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>Tuần {weekNumber} — Chọn tiêu chí xóa bên dưới</p>
              </div>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Mode selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Xóa theo:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { value: 'week', label: '🗓️ Toàn bộ tuần này', desc: 'Xóa tất cả tiết tuần ' + weekNumber },
                  { value: 'class', label: '🏫 Theo lớp', desc: 'Chỉ xóa tiết của 1 lớp' },
                  { value: 'subject', label: '📚 Theo môn học', desc: 'Xóa tất cả tiết của 1 môn' },
                  { value: 'teacher', label: '👤 Theo giáo viên', desc: 'Xóa tất cả tiết của 1 GV' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setBulkDeleteMode(opt.value); setBulkFilterId(''); }}
                    style={{
                      padding: '12px 14px', borderRadius: 10, border: '2px solid',
                      borderColor: bulkDeleteMode === opt.value ? '#dc2626' : '#e5e7eb',
                      background: bulkDeleteMode === opt.value ? '#fef2f2' : '#f9fafb',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: bulkDeleteMode === opt.value ? '#dc2626' : '#374151' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter selector (lớp/môn/GV) */}
            {bulkDeleteMode !== 'week' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                  {bulkDeleteMode === 'class' ? 'Chọn lớp:' : bulkDeleteMode === 'subject' ? 'Chọn môn học:' : 'Chọn giáo viên:'}
                </label>
                <select
                  value={bulkFilterId}
                  onChange={e => setBulkFilterId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1.5px solid #d1d5db', fontSize: 14, color: '#111827',
                    background: 'white', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="">
                    {bulkDeleteMode === 'class' ? '-- Chọn lớp --' : bulkDeleteMode === 'subject' ? '-- Chọn môn --' : '-- Chọn GV --'}
                  </option>
                  {bulkDeleteMode === 'class' && classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  {bulkDeleteMode === 'subject' && uniqueSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  {bulkDeleteMode === 'teacher' && uniqueTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Loại tiết */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Loại tiết:</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([{ v: 'ALL', l: 'Tất cả' }, { v: 'NORMAL', l: 'Tiết gốc' }, { v: 'SUBSTITUTE', l: 'Tiết ĐC' }] as const).map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setBulkStatus(opt.v)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
                      borderColor: bulkStatus === opt.v ? '#2563eb' : '#e5e7eb',
                      background: bulkStatus === opt.v ? '#eff6ff' : '#f9fafb',
                      color: bulkStatus === opt.v ? '#1d4ed8' : '#6b7280',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e5e7eb',
                  background: 'white', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: isBulkDeleting ? '#fca5a5' : '#dc2626',
                  color: 'white', fontWeight: 700, fontSize: 14, cursor: isBulkDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                {isBulkDeleting ? (
                  <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Đang xóa...</>
                ) : '🗑️ Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Import AI Modal ─── */}
      {showImportAIModal && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setShowImportAIModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              width: '100%', maxWidth: 700, padding: '32px', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>🤖 Nhập Thời Khóa Biểu từ AI</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>Dán mảng JSON chứa thông tin TKB vào ô bên dưới</p>
              </div>
              <button
                onClick={() => setShowImportAIModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9ca3af', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Prompt Tip */}
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>💡 Mẫu câu lệnh (Prompt) cho ChatGPT / Gemini:</span>
                <button
                  onClick={() => {
                    const promptText = `Từ ảnh/file excel TKB này, hãy trích xuất lịch học thành một mảng JSON chính xác theo cấu trúc này (không diễn giải thêm):\n[\n  { "dayOfWeek": 2, "session": "SANG", "period": 1, "className": "6A", "subjectName": "Toán", "teacherName": "Hương" }\n]`;
                    navigator.clipboard.writeText(promptText).then(() => alert('Đã copy câu lệnh!'));
                  }}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#166534',
                    backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#bbf7d0'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
                >
                  📋 Copy
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5, fontFamily: 'monospace' }}>
                Từ ảnh/file excel TKB này, hãy trích xuất lịch học thành một mảng JSON chính xác theo cấu trúc này (không diễn giải thêm):<br/>
                [<br/>
                &nbsp;&nbsp;{'{'} "dayOfWeek": 2, "session": "SANG", "period": 1, "className": "6A", "subjectName": "Toán", "teacherName": "Hương" {'}'}<br/>
                ]
              </div>
            </div>

            <textarea
              value={importJSONText}
              onChange={e => setImportJSONText(e.target.value)}
              placeholder='[&#10;  { "dayOfWeek": 2, "session": "SANG", "period": 1, "className": "6A", "teacherName": "Hương" }&#10;]'
              style={{
                width: '100%', height: '200px', padding: '12px', borderRadius: 8,
                border: '1.5px solid #d1d5db', fontSize: 14, fontFamily: 'monospace', color: '#111827',
                resize: 'vertical', outline: 'none'
              }}
            />

            {importResults && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: 13, overflowY: 'auto', maxHeight: '200px' }}>
                <div style={{ fontWeight: 700, color: '#059669', marginBottom: 4 }}>✅ Thành công: {importResults.successCount} tiết</div>
                <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ Bỏ qua: {importResults.skipCount} tiết</div>
                {importResults.skippedItems && importResults.skippedItems.length > 0 && (
                  <ul style={{ paddingLeft: 20, margin: 0, color: '#4b5563' }}>
                    {importResults.skippedItems.map((s: any, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <strong>Lý do:</strong> {s.reason} <br/>
                        <code style={{ fontSize: 11, background: '#e5e7eb', padding: '2px 4px', borderRadius: 4 }}>{JSON.stringify(s.item)}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => { setShowImportAIModal(false); setImportResults(null); }}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e5e7eb',
                  background: 'white', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                onClick={handleImportJSON}
                disabled={isImporting}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: isImporting ? '#93c5fd' : '#2563eb',
                  color: 'white', fontWeight: 700, fontSize: 14, cursor: isImporting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                {isImporting ? 'Đang xử lý...' : 'Bắt đầu xử lý'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-gray-900 p-2 md:p-4 flex flex-col overflow-hidden' : 'flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col'} text-gray-900 dark:text-gray-200 transition-all duration-300`}>
        {/* Top Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded text-sm font-medium transition-colors"
                style={{ padding: '6px 12px' }}
              >
                {isFullscreen ? '↙️ Thu nhỏ' : '🔲 Toàn màn hình'}
              </button>
              {!readOnly && (
                <button 
                  onClick={handleSyncPPCT}
                  disabled={isSyncing}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print mr-2"
                  style={{ padding: '6px 12px' }}
                  title="Đồng bộ lại tên bài PPCT cho tuần này"
                >
                  {isSyncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ PPCT'}
                </button>
              )}
              <button 
                onClick={handleDownloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print mr-2"
                style={{ padding: '6px 12px' }}
                title="Tải TKB (Excel)"
              >
                📊 Tải Excel
              </button>
              <div className="relative group inline-block">
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                  style={{ padding: '6px 12px' }}
                  title="Xuất bảng TKB thành ảnh PNG"
                >
                  📸 Xuất ảnh ▾
                </button>
                <div className="absolute left-0 mt-1 hidden group-hover:flex flex-col bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded z-50 whitespace-nowrap overflow-hidden" style={{ minWidth: '160px' }}>
                  <button onClick={() => handleExportPNG('CLEAN')} className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">TKB - Tiêu chuẩn</button>
                  <button onClick={() => handleExportPNG('FULL')} className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700">TKB - Nâng cao</button>
                  <button onClick={() => handleExportPNG('DETAIL')} className="px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700">TKB - Chi tiết (Kèm tên bài)</button>
                </div>
              </div>
              <button
                onClick={() => setShowColorSettings(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors border border-gray-300"
                style={{ padding: '6px 12px' }}
                title="Cài đặt màu sắc TKB"
              >
                🎨 Màu sắc
              </button>
              <button
                disabled={isNavigatingWeek}
                onClick={() => {
                  setIsNavigatingWeek(true);
                  router.push(`/dashboard/timetable/branch?week=${weekNumber - 1}`);
                }}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm font-medium hidden sm:block disabled:opacity-50"
                style={{ padding: '6px 12px' }}
              >
                ← Tuần trước
              </button>
              <div className="flex items-center self-center bg-blue-50 text-blue-800 rounded dark:bg-blue-900/50 dark:text-blue-200 px-2" style={{ padding: '4px 8px' }}>
                <span className="font-bold text-lg mr-1">Tuần</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  key={weekNumber}
                  defaultValue={weekNumber}
                  className="font-bold text-lg bg-transparent w-12 text-center border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ MozAppearance: 'textfield' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt((e.target as HTMLInputElement).value);
                      if (val && val > 0 && val !== weekNumber) {
                        setSavingCells(new Set());
                        router.push(`/dashboard/timetable/branch?week=${val}`);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (val && val > 0 && val !== weekNumber) {
                      setSavingCells(new Set());
                      router.push(`/dashboard/timetable/branch?week=${val}`);
                    } else {
                      e.target.value = weekNumber.toString();
                    }
                  }}
                  title="Nhập số tuần và ấn Enter để chuyển"
                />
              </div>
              <button
                disabled={isNavigatingWeek}
                onClick={() => {
                  setIsNavigatingWeek(true);
                  router.push(`/dashboard/timetable/branch?week=${weekNumber + 1}`);
                }}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm font-medium disabled:opacity-50"
                style={{ padding: '6px 12px' }}
              >
                Tuần sau →
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/timetable/branch/detailed?week=${weekNumber}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white' }}
              >
                TKB Chi tiết
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={handleRollover}
                    disabled={rolloverPending}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ padding: '8px 16px', backgroundColor: '#f97316', color: 'white' }}
                  >
                    {rolloverPending ? 'Đang xử lý...' : `Đôn tiết sang Tuần ${weekNumber + 1}`}
                  </button>
                  <button
                    onClick={() => setShowImportAIModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition-colors"
                    style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white' }}
                  >
                    🤖 Nhập TKB (AI)
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                    style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white' }}
                  >
                    🗑️ Xóa hàng loạt
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Settings Toolbar */}
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              Hiển thị:
            </span>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={hideSaturday} onChange={e => setHideSaturday(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Ẩn Thứ 7
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={showPeriod5} onChange={e => setShowPeriod5(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Hiện tiết 5 (Sáng)
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Ẩn tiết trống
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input type="checkbox" checked={showPeriodNumber} onChange={e => setShowPeriodNumber(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Hiện tiết PPCT
            </label>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className={`w-full max-w-full overflow-auto flex-1 custom-scrollbar min-h-0 relative ${isDragging.current ? 'select-none' : ''}`} 
          style={{ maxHeight: isFullscreen ? 'none' : '80vh' }}
          
          
          
          
        >
          <div ref={tableRef} className="bg-white dark:bg-gray-800 min-w-max">
            <div className="text-center py-6 select-none border-x-2 border-t-2 border-slate-400 dark:border-slate-500 border-b-0 bg-white dark:bg-gray-800" style={{ color: 'inherit' }}>
              <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100">
                Thời Khóa Biểu Tuần {weekNumber}
              </h2>
              <p className="text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-300 mt-2">
                Từ ngày {weekStartStr} đến ngày {weekEndStr}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                Năm học {schoolYear || '2026-2027'}
              </p>
            </div>
            <table id="tkb-table" className={`w-full text-left border-collapse border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-gray-800`}>
            <thead className="sticky top-0 z-30 shadow-md">
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className={`sticky left-0 z-40 bg-gray-200 dark:bg-gray-800 border-2 border-slate-400 dark:border-slate-500 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold uppercase text-center w-16 min-w-[64px] max-w-[64px]`}>Thứ</th>
                <th className={`sticky left-[64px] z-40 bg-gray-200 dark:bg-gray-800 border-2 border-slate-400 dark:border-slate-500 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold uppercase text-center w-16 min-w-[64px] max-w-[64px]`}>Buổi</th>
                <th className={`sticky left-[128px] z-40 bg-gray-200 dark:bg-gray-800 border-2 border-slate-400 dark:border-slate-500 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold uppercase text-center w-12 min-w-[48px] max-w-[48px]`}>Tiết</th>
                {classes.flatMap((c: any) => [
                  <th key={`c-${c.id}`} className={`border-2 border-slate-400 border-l-4 border-l-slate-500 dark:border-slate-500 dark:border-l-slate-400 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold uppercase text-center min-w-[130px] bg-gray-100 dark:bg-gray-800`}>
                    {c.name}
                  </th>,
                  <th key={`dc-${c.id}`} className={`border-2 border-slate-400 border-r-4 border-r-slate-500 dark:border-slate-500 dark:border-r-slate-400 py-2 px-0.5 text-[8px] font-medium uppercase text-center w-8 text-slate-600 bg-slate-300/80 dark:bg-gray-700/80`}>
                    ĐC
                  </th>
                ])}
                <th className={`border-2 border-slate-400 border-l-4 border-l-slate-500 dark:border-slate-500 dark:border-l-slate-400 py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-semibold uppercase text-center min-w-[180px] bg-gray-200 dark:bg-gray-800`}>
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const dayName = day === 8 ? 'Chủ Nhật' : (day === 2 ? 'Hai' : (day === 3 ? 'Ba' : (day === 4 ? 'Tư' : (day === 5 ? 'Năm' : (day === 6 ? 'Sáu' : (day === 7 ? 'Bảy' : ''))))));
                const getVisiblePeriods = (sessionStr: string) => {
                  const currentPeriods = (sessionStr === 'SANG' && showPeriod5) ? [1, 2, 3, 4, 5] : periods;
                  if (!hideEmptyRows) return currentPeriods;
                  let vPeriods = currentPeriods.filter(p => !classes.every((cls: any) => !getSlot(day, p, sessionStr, cls.id, 'NORMAL') && !getSlot(day, p, sessionStr, cls.id, 'SUBSTITUTE')));
                  if (vPeriods.length === 0 && sessionStr === 'CHIEU') {
                    const note = timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === sessionStr)?.content || '';
                    if (note.trim().length > 0) {
                      vPeriods = [1]; // Force show Period 1 if there's a note
                    }
                  }
                  return vPeriods;
                };

                const dayRowsCount = sessions.reduce((acc, sessionStr) => acc + getVisiblePeriods(sessionStr).length, 0);

                if (dayRowsCount === 0) return null;
                
                let dayRowSpanRendered = false;
                const visibleSessions = sessions.filter(s => getVisiblePeriods(s).length > 0);

                return visibleSessions.map((session, sIdx) => {
                  const visiblePeriods = getVisiblePeriods(session);

                  let sessionRowSpanRendered = false;

                  return visiblePeriods.map((period, pIdx) => {
                    // Đổ màu xen kẽ cho Thứ và Sáng/Chiều
                    const isEvenDay = day % 2 === 0;
                    const rowBgClass = session === 'SANG'
                      ? (isEvenDay ? 'bg-blue-50/20 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800')
                      : (isEvenDay ? 'bg-amber-50/20 dark:bg-amber-900/10' : 'bg-slate-50/30 dark:bg-slate-800/50');

                    const renderDayCell = !dayRowSpanRendered;
                    if (renderDayCell) dayRowSpanRendered = true;

                    const renderSessionCell = !sessionRowSpanRendered;
                    if (renderSessionCell) sessionRowSpanRendered = true;

                    const isLastPeriodOfDay = sIdx === visibleSessions.length - 1 && pIdx === visiblePeriods.length - 1;
                    const isLastPeriodOfSession = pIdx === visiblePeriods.length - 1;
                    const borderBottomClass = isLastPeriodOfDay
                      ? 'border-b-4 border-b-slate-600 dark:border-b-slate-400'
                      : isLastPeriodOfSession
                        ? 'border-b-2 border-b-slate-500 dark:border-b-slate-400'
                        : 'border-b border-b-slate-300 dark:border-b-slate-600';

                    return (
                    <tr key={`${day}-${session}-${period}`} className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${rowBgClass}`}>
                      {renderDayCell && (
                        <td rowSpan={dayRowsCount} className={`sticky left-0 z-20 border-2 border-slate-400 dark:border-slate-500 text-center font-bold bg-gray-100 dark:bg-gray-800 w-16 min-w-[64px] max-w-[64px]`}>
                          Thứ {day}
                          <div className="text-[10px] font-normal text-slate-600 dark:text-slate-300 mt-1">{getDayDate(weekNumber, day)}</div>
                        </td>
                      )}
                      {renderSessionCell && (
                        <td rowSpan={visiblePeriods.length} className={`sticky left-[64px] z-20 border-2 border-slate-400 dark:border-slate-500 text-center text-[10px] sm:text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/90 w-16 min-w-[64px] max-w-[64px]`}>
                          {session === 'SANG' ? 'Sáng' : 'Chiều'}
                        </td>
                      )}
                      <td className={`sticky left-[128px] z-20 border-x-2 border-slate-400 dark:border-slate-500 text-center text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 w-12 min-w-[48px] max-w-[48px] ${borderBottomClass}`}>
                        {period}
                      </td>

                      {classes.flatMap((cls: any) => {
                        const normalSlot = getSlot(day, period, session, cls.id, 'NORMAL');
                        const subSlot = getSlot(day, period, session, cls.id, 'SUBSTITUTE');
                        const clsAssignments = assignments
                          .filter((a: any) => a.classId === cls.id)
                          .sort((a: any, b: any) => {
                            const nameA = a.teacher.name.split(' ').pop() || '';
                            const nameB = b.teacher.name.split(' ').pop() || '';
                            if (nameA === nameB) return formatSubjectName(a.subject.name).localeCompare(formatSubjectName(b.subject.name), 'vi');
                            return nameA.localeCompare(nameB, 'vi');
                          });
                        
                        const normalKey = `${day}-${session}-${period}-${cls.id}-NORMAL`;
                        const subKey = `${day}-${session}-${period}-${cls.id}-SUBSTITUTE`;
                        const isNormalSaving = savingCells.has(normalKey);
                        const isSubSaving = savingCells.has(subKey);
                        
                        const cellNoteData = localCellNotes.find((n: any) => n.classId === cls.id && n.dayOfWeek === day && n.period === period && n.session === session);
                        const isDayThayCustom = cellNoteData?.content.startsWith('[DAY_THAY] ');
                        const isLapGioCustom = cellNoteData?.content.startsWith('[LAP_GIO] ');

                        const isOverridden = !!subSlot || isDayThayCustom || isLapGioCustom;

                        const renderSlotUI = (slot: any, isSaving: boolean, isOverridden: boolean, status: 'NORMAL' | 'SUBSTITUTE') => {
                          const isHighlightedSubject = (hoveredItem?.type === 'subject' && hoveredItem.value === slot.assignment.subject.name) ||
                                                       (lockedItem?.type === 'subject' && lockedItem.value === slot.assignment.subject.name);
                          const isHighlightedTeacher = (hoveredItem?.type === 'teacher' && hoveredItem.value === slot.assignment.teacher.id) ||
                                                       (lockedItem?.type === 'teacher' && lockedItem.value === slot.assignment.teacher.id);
                          const isDoubleBooked = doubleBookedSlotIds.has(slot.id);

                          return (
                          <div
                            className={`relative group px-1 pb-1 pt-1 sm:px-1 sm:pb-1 sm:pt-1 text-xs rounded cursor-default flex items-center w-full h-full ${exportMode === 'DETAIL' ? 'whitespace-normal h-auto min-h-[48px]' : 'whitespace-nowrap overflow-hidden'} transition-all ${isSaving ? 'saving-cell opacity-70' : ''} ${
                              isOverridden ? 'opacity-60 !bg-transparent !border-gray-200 dark:!bg-transparent dark:!border-gray-700 pointer-events-none' : ''
                            } ${
                              isDoubleBooked
                                ? 'bg-red-100 border-2 border-red-500 font-extrabold dark:bg-red-900/40 shadow-sm'
                                : isHighlightedSubject
                                  ? 'bg-amber-300 text-amber-950 font-extrabold dark:bg-amber-600 dark:text-white'
                                  : isHighlightedTeacher
                                    ? 'bg-fuchsia-300 text-fuchsia-950 font-extrabold dark:bg-fuchsia-600 dark:text-white'
                                    : status === 'SUBSTITUTE'
                                      ? 'text-amber-700 border border-amber-300 dark:text-amber-400 dark:border-amber-700 bg-transparent'
                                      : 'text-blue-800 font-medium dark:text-blue-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                            title={isDoubleBooked ? 'Cảnh báo: Giáo viên đang bị phân công trùng giờ!' : ''}
                          >
                            {exportMode === 'DETAIL' ? (
                              <div className="relative z-10 flex flex-col items-center justify-center w-full px-1 py-1 gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-sm" style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.subject) }}>
                                    {formatSubjectName(slot.assignment.subject.name)}
                                  </span>
                                  <span className="font-light opacity-60" style={{ color: isOverridden ? colors.overridden : '#9ca3af' }}>-</span>
                                  <span style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.teacher) }}>
                                    {slot.assignment.teacher.shortName || slot.assignment.teacher.name.split(' ').pop()}
                                  </span>
                                </div>
                                {(() => {
                                  const ts = slot.teachingSchedules?.[0];
                                  const lessonNum = ts?.actualLessonNum || getPeriodNumInWeek(slot.id, slot.assignment.id);
                                  let lessonName = ts?.actualLessonName;
                                  if (!lessonName || lessonName === 'Chưa có PPCT' || lessonName === 'Chưa có tên bài') {
                                    lessonName = 'Chưa cập nhật tên bài';
                                  }
                                  return lessonNum !== null ? (
                                    <div 
                                      className="text-[10px] text-center w-full max-w-full break-words leading-tight" 
                                      style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.period) }}
                                    >
                                      <span className="font-bold border-b border-current mb-0.5 inline-block">Tiết {lessonNum}</span><br/>
                                      <span className="opacity-80 italic">{lessonName}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            ) : (
                              <span className="relative z-10 flex items-center justify-center w-full px-1 gap-1">
                                <span
                                  onClick={() => toggleLockItem('subject', slot.assignment.subject.name)}
                                  onMouseEnter={() => setHoveredItem({ type: 'subject', value: slot.assignment.subject.name })}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  className="font-bold text-sm truncate hover:underline cursor-pointer"
                                  title={formatSubjectName(slot.assignment.subject.name)}
                                  style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.subject) }}
                                >
                                  {formatSubjectName(slot.assignment.subject.name)}
                                  {showPeriodNumber && (() => {
                                    const ts = slot.teachingSchedules?.[0];
                                    const lessonNum = ts?.actualLessonNum || getPeriodNumInWeek(slot.id, slot.assignment.id);
                                    if (lessonNum === null) return null;
                                    let lessonName = ts?.actualLessonName;
                                    if (!lessonName || lessonName === 'Chưa có PPCT' || lessonName === 'Chưa có tên bài') {
                                      lessonName = 'Chưa cập nhật tên bài';
                                    }
                                    return (
                                      <span 
                                        className="font-bold ml-1 cursor-help" 
                                        title={ts ? `Tiết ${lessonNum} - ${lessonName}` : `Tiết ${lessonNum} (Chưa đồng bộ)`}
                                        style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.period) }}
                                      >
                                        {" "}{lessonNum}
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="flex-shrink-0 font-light opacity-60" style={{ color: isOverridden ? colors.overridden : '#9ca3af' }}>-</span>
                                <span
                                  onClick={() => toggleLockItem('teacher', slot.assignment.teacher.id)}
                                  onMouseEnter={() => setHoveredItem({ type: 'teacher', value: slot.assignment.teacher.id })}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  className={`truncate hover:underline cursor-pointer`}
                                  title={slot.assignment.teacher.name}
                                  style={{ color: isOverridden ? colors.overridden : isDoubleBooked ? '#b91c1c' : (status === 'SUBSTITUTE' ? colors.substitute : colors.teacher) }}
                                >
                                  {slot.assignment.teacher.shortName || slot.assignment.teacher.name.split(' ').pop()}
                                </span>
                              </span>
                            )}
                            {!isSaving && !isOverridden && !readOnly && (
                              <button
                                className="absolute top-0 right-0 hidden group-hover:flex w-5 h-5 bg-red-500 text-white rounded-bl items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity z-10"
                                style={{ backgroundColor: '#ef4444', color: 'white' }}
                                onClick={(e) => handleDelete(slot.id, e)}
                                title="Xóa tiết này"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        );
                        };

                        const normalCol = (
                          <td key={normalKey} className={`relative border-x-2 border-slate-400 border-l-4 border-l-slate-500 dark:border-slate-500 dark:border-l-slate-400 p-1 ${borderBottomClass}`}>
                            {pIdx === 0 && visiblePeriods.length > 0 && (
                              <div 
                                className="absolute left-0 right-0 flex flex-col items-center opacity-70 pointer-events-none select-none z-0" 
                                style={{ top: `${(visiblePeriods.length / 2) * 100}%`, transform: 'translateY(-50%)', userSelect: 'none' }}
                              >
                                <div 
                                  className="watermark-text text-[56px] font-black leading-none tracking-tighter"
                                  style={{ color: colors.watermark }}
                                >
                                  {cls.name}
                                </div>
                                <div 
                                  className="watermark-text text-[16px] font-black uppercase tracking-tight mt-1 whitespace-nowrap"
                                  style={{ color: colors.watermark }}
                                >
                                  {dayName} - {session === 'SANG' ? 'SÁNG' : 'CHIỀU'}
                                </div>
                              </div>
                            )}
                            <div className="relative z-10 h-full">
                              {(() => {
                                const cellNote = localCellNotes.find((n: any) => n.classId === cls.id && n.dayOfWeek === day && n.period === period && n.session === session);
                                if (cellNote && !cellNote.content.startsWith('[DAY_THAY] ')) {
                                  const displayContent = cellNote.content.startsWith('[LAP_GIO] ') ? cellNote.content.replace('[LAP_GIO] ', '') : cellNote.content;
                                  return (
                                    <div className="relative w-full h-full flex items-center justify-center p-1 group">
                                      <span className="font-bold text-sm text-black whitespace-pre-wrap break-words text-center" style={{ color: '#000000' }}>
                                        {displayContent}
                                      </span>
                                      {!readOnly && exportMode === 'IDLE' && (
                                        <button
                                          className="absolute top-0 right-0 hidden group-hover:flex w-5 h-5 bg-red-500 text-white rounded-bl items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity z-10"
                                          onClick={(e) => handleDeleteCellNote(day, period, session, cls.id, e)}
                                          title="Xóa ghi chú này"
                                        >
                                          &times;
                                        </button>
                                      )}
                                    </div>
                                  );
                                }
                                return normalSlot ? renderSlotUI(normalSlot, isNormalSaving, isOverridden, 'NORMAL') : (
                                  <div className="w-full h-full flex flex-col items-center justify-center group gap-0.5 relative">
                                    {(!readOnly && exportMode === 'IDLE') && (
                                      <>
                                        <select
                                          className="w-full h-full text-xs p-1 bg-transparent border-none focus:ring-0 text-gray-500 cursor-pointer outline-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded !bg-center"
                                          onChange={(e) => { handleAssign(day, period, session, cls.id, e.target.value, 'NORMAL'); e.target.value = ''; }}
                                          value=""
                                        >
                                          <option value="" disabled></option>
                                          {clsAssignments.map((a: any) => (
                                            <option key={a.id} value={a.id}>
                                              {formatSubjectName(a.subject.name)} ({a.teacher.name.split(' ').pop()})
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          placeholder="Tùy chỉnh..."
                                          className="absolute bottom-0.5 left-0.5 right-5 w-auto text-[10px] p-0.5 bg-gray-50 border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded text-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSaveCellNote(day, period, session, cls.id, e.currentTarget.value);
                                              e.currentTarget.value = '';
                                            }
                                          }}
                                          onBlur={(e) => {
                                            if (e.currentTarget.value.trim()) {
                                              handleSaveCellNote(day, period, session, cls.id, e.currentTarget.value);
                                              e.currentTarget.value = '';
                                            }
                                          }}
                                        />
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        );

                        return [
                          normalCol,
                          <td key={subKey} className={`relative border-x-2 border-slate-400 border-r-4 border-r-slate-500 dark:border-slate-500 dark:border-r-slate-400 p-1 ${borderBottomClass} bg-amber-50/40 dark:bg-amber-900/30 align-top ${isFullscreen ? '' : 'min-w-[32px]'} ${!subSlot && !isFullscreen ? 'w-8 max-w-[32px] overflow-hidden' : ''}`}>
                            <div className="relative z-10 h-full flex flex-col justify-center">
                              {subSlot ? renderSlotUI(subSlot, isSubSaving, false, 'SUBSTITUTE') : (
                                cellNoteData && cellNoteData.content.startsWith('[DAY_THAY] ') ? (
                                  <div className="relative w-full h-full flex items-center justify-center p-1 group min-h-[32px]">
                                    <span className="font-bold text-xs whitespace-pre-wrap break-words text-center" style={{ color: colors.substitute }}>
                                      {cellNoteData.content.replace('[DAY_THAY] ', '')}
                                    </span>
                                    {!readOnly && exportMode === 'IDLE' && (
                                      <button
                                        className="absolute top-0 right-0 hidden group-hover:flex w-5 h-5 bg-red-500 text-white rounded-bl items-center justify-center text-xs opacity-80 hover:opacity-100 transition-opacity z-10"
                                        onClick={(e) => handleDeleteCellNote(day, period, session, cls.id, e)}
                                        title="Xóa người dạy thay"
                                      >
                                        &times;
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                (!readOnly && exportMode === 'IDLE') && <select
                                  className="w-full text-xs p-0 bg-transparent border-none focus:ring-0 text-gray-400 hover:text-amber-600 cursor-pointer outline-none transition-colors rounded text-center appearance-none text-lg font-light"
                                  onChange={(e) => { 
                                    if(e.target.value) {
                                      setPendingSubstitute({ day, period, session: session as 'SANG' | 'CHIEU', classId: cls.id, assignmentId: e.target.value });
                                      setSubstituteNote('');
                                      setCustomSubstituteName('');
                                      setSubstituteType('DAY_THAY');
                                      e.target.value = ''; 
                                    }
                                  }}
                                  value=""
                                  title="Thêm tiết điều chỉnh (thay thế)"
                                >
                                  <option value="" disabled>+</option>
                                  <option value="CUSTOM" className="font-bold text-blue-600">-- Nhập tay --</option>
                                  {clsAssignments.map((a: any) => (
                                    <option key={a.id} value={a.id}>
                                      {formatSubjectName(a.subject.name)} ({a.teacher.name.split(' ').pop()})
                                    </option>
                                  ))}
                                </select>
                                )
                              )}
                            </div>
                          </td>
                        ];
                      })}
                      {renderSessionCell && (
                        <td 
                          rowSpan={visiblePeriods.length} 
                          className={`border-2 border-slate-400 border-l-4 border-l-slate-500 dark:border-slate-500 dark:border-l-slate-400 p-1 sm:p-2 text-center align-top min-w-[180px] bg-gray-100 dark:bg-gray-800`}
                        >
                          {exportMode !== 'IDLE' || readOnly ? (
                            <div className="w-full h-full min-h-[80px] p-1 sm:p-2 text-[10px] sm:text-xs text-left whitespace-pre-wrap break-words">
                              {timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === session)?.content || ''}
                            </div>
                          ) : (
                            <textarea
                              className="w-full h-full min-h-[80px] p-1 sm:p-2 text-[10px] sm:text-xs bg-white dark:bg-gray-900 border-2 border-dashed border-slate-400 dark:border-slate-500 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y placeholder-gray-500 print:placeholder-transparent dark:placeholder-gray-400 dark:print:placeholder-transparent hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors shadow-inner"
                              placeholder="Ghi chú (Nghỉ lễ, chào cờ, ngoại khóa...)"
                              defaultValue={
                                timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === session)?.content || ''
                              }
                              onBlur={(e) => {
                                const val = e.target.value;
                                saveTimetableNote(weekNumber, day, session as any, val, '2026-2027', branch).then(res => {
                                  if(!res.success) alert("Lỗi khi lưu ghi chú: " + res.error);
                                });
                              }}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                });
              });
            })}
            </tbody>
            {(exportMode === 'FULL' || exportMode === 'IDLE') && (
            <tfoot className="bg-slate-100 dark:bg-gray-800 border-t-4 border-slate-600 dark:border-slate-400">
              <tr>
                <td colSpan={4 + classes.length * (exportMode === 'CLEAN' ? 1 : 2)} className="border-2 border-slate-400 dark:border-slate-500 py-3 px-3">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="text-sm font-bold uppercase tracking-widest text-gray-700 dark:text-gray-200 shadow-inner">
                      KIỂM SOÁT PHÂN PHỐI CHƯƠNG TRÌNH
                    </div>
                    <div className="flex items-center gap-6 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                        <input type="checkbox" checked={showT} onChange={e => setShowT(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        Tuần
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                        <input type="checkbox" checked={showHK1} onChange={e => setShowHK1(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        HK 1
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                        <input type="checkbox" checked={showHK2} onChange={e => setShowHK2(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        HK 2
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-blue-600">
                        <input type="checkbox" checked={showCN} onChange={e => setShowCN(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        Cả năm (CN)
                      </label>
                    </div>
                  </div>
                </td>
              </tr>
              <tr className="bg-slate-200 dark:bg-slate-700">
                <td colSpan={3} className="sticky left-0 z-20 font-bold border-2 border-slate-400 dark:border-slate-500 py-2 px-3 text-center text-xs uppercase text-slate-700 dark:text-gray-300">
                  Môn học
                </td>
                {classes.map((cls: any) => (
                  <td key={`stat-header-${cls.id}`} colSpan={exportMode === 'CLEAN' ? 1 : 2} className="border-2 border-slate-400 dark:border-slate-500 py-2 px-3 text-center font-bold text-xs text-slate-800 dark:text-gray-200">
                    Lớp {cls.name}
                  </td>
                ))}
                <td className="border-2 border-slate-400 dark:border-slate-500 py-2 px-3 bg-gray-200 dark:bg-gray-800"></td>
              </tr>
              {masterSubjectsList.map((subjectName, idx) => {
                const isHighlighted = hoveredItem?.type === 'subject' && hoveredItem.value === subjectName;
                return (
                  <tr
                    key={`stat-row-${subjectName}`}
                    onMouseEnter={() => setHoveredItem({ type: 'subject', value: subjectName })}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group transition-colors ${isHighlighted ? 'bg-amber-200 dark:bg-amber-900/60' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-100 dark:bg-gray-700/50'} hover:bg-amber-100 dark:hover:bg-amber-900/40`}
                  >
                    <td colSpan={3} className={`sticky left-0 z-20 font-bold border-2 border-slate-400 border-r-4 border-r-slate-500 dark:border-slate-500 dark:border-r-slate-400 py-3 px-3 text-right text-sm text-gray-800 dark:text-gray-200 transition-colors ${isHighlighted ? 'bg-amber-200 dark:bg-amber-900/60' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-100 dark:bg-gray-700'} group-hover:bg-amber-100`}>
                      {formatSubjectName(subjectName)}
                    </td>
                    {classes.map((cls: any) => {
                      const clsStat = derivedStats.find((s: any) => s.className === cls.name);
                      let subjInfo = clsStat?.subjects.find((s: any) => s.subjectName === subjectName);

                      // Lấy danh sách trùng từ server (toàn năm học)
                      const duplicates = subjInfo?.duplicateLessonNums || [];
                      const hasDuplicate = duplicates.length > 0;

                      if (userRole === 'GV' && currentUserId && !gvAssignedMap.has(`${subjectName}-${cls.id}`)) {
                        subjInfo = undefined;
                      }

                      if (!subjInfo) {
                        return <td key={`stat-${cls.id}-${subjectName}`} colSpan={exportMode === 'CLEAN' ? 1 : 2} className="border-2 border-slate-400 border-l-4 border-l-slate-500 border-r-4 border-r-slate-500 dark:border-slate-500 dark:border-l-slate-400 dark:border-r-slate-400 p-2 text-center text-gray-300 dark:text-gray-600">-</td>;
                      }

                      const contextSuffix = ` [Môn ${subjectName} - Lớp ${cls.name}]`;
                      const statusTitle = hasDuplicate ? `Trùng tiết PPCT${contextSuffix}` : 
                        (subjInfo.status === 'green' ? `Đã xếp đủ tiết trong tuần (${subjInfo.planWeek}/${subjInfo.planWeek})${contextSuffix}` :
                        subjInfo.status === 'red' ? `Đang xếp thiếu tiết trong tuần (${subjInfo.scheduledWeek}/${subjInfo.planWeek})${contextSuffix}` : 
                        `Đang xếp thừa tiết trong tuần (${subjInfo.scheduledWeek}/${subjInfo.planWeek})${contextSuffix}`);

                      return (
                        <td key={`stat-${cls.id}-${subjectName}`} colSpan={exportMode === 'CLEAN' ? 1 : 2} className={`border-2 border-slate-400 border-l-4 border-l-slate-500 border-r-4 border-r-slate-500 dark:border-slate-500 dark:border-l-slate-400 dark:border-r-slate-400 p-2 align-middle ${hasDuplicate ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                          <div className={`px-2.5 py-2 rounded flex flex-col items-center justify-center ${
                            hasDuplicate ? 'text-red-700 dark:text-red-400 font-extrabold border-2 border-red-500 bg-red-100 dark:bg-red-900/40 shadow-sm' :
                            (subjInfo.status === 'green' ? 'text-green-700 dark:text-green-400' :
                            subjInfo.status === 'red' ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-yellow-600 dark:text-yellow-400 font-extrabold')
                          }`} title={statusTitle}>
                            {hasDuplicate && (
                              <div className="flex items-center justify-center gap-1 mb-1 text-red-600 dark:text-red-400 text-[11px] font-black animate-pulse">
                                ⚠ TRÙNG TIẾT PPCT: {duplicates.join(', ')}
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-1.5 text-[12px] font-bold opacity-90 whitespace-nowrap">
                              {showT && <span>T: {subjInfo.scheduledWeek}/{subjInfo.planWeek}</span>}
                              {showT && (showHK1 || showHK2 || showCN) && <span className="border-l border-current h-3 opacity-30 mx-1"></span>}
                              {showHK1 && <span>HK1: {subjInfo.scheduledHk1}/{subjInfo.planHk1}</span>}
                              {showHK1 && (showHK2 || showCN) && <span className="border-l border-current h-3 opacity-30 mx-1"></span>}
                              {showHK2 && <span>HK2: {subjInfo.scheduledHk2}/{subjInfo.planHk2}</span>}
                              {showHK2 && showCN && <span className="border-l border-current h-3 opacity-30 mx-1"></span>}
                              {showCN && <span>CN: {subjInfo.scheduledYear}/{subjInfo.planYear}</span>}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border-2 border-slate-400 dark:border-slate-500 bg-gray-100 dark:bg-gray-800"></td>
                  </tr>
                );
              })}
            </tfoot>
            )}
          </table>
          </div>
        </div>
      </div>
      {showColorSettings && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-96 max-w-full border border-gray-200 dark:border-gray-700" style={{ padding: '24px' }}>
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">🎨 Cài đặt màu sắc TKB</h2>
            
            <div className="flex flex-col" style={{ gap: '16px' }}>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Tên môn</label>
                <input type="color" value={colors.subject} onChange={e => updateColor('subject', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Tên giáo viên</label>
                <input type="color" value={colors.teacher} onChange={e => updateColor('teacher', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Số tiết PPCT</label>
                <input type="color" value={colors.period} onChange={e => updateColor('period', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Dạy thay (Lấp giờ)</label>
                <input type="color" value={colors.substitute || '#b45309'} onChange={e => updateColor('substitute', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Bị lấp (Tiết cũ)</label>
                <input type="color" value={colors.overridden || '#9ca3af'} onChange={e => updateColor('overridden', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600" style={{ padding: '12px 16px' }}>
                <label className="font-semibold text-sm text-gray-700 dark:text-gray-200">Màu Chữ chìm (Watermark)</label>
                <input type="color" value={colors.watermark} onChange={e => updateColor('watermark', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>

            <div className="flex justify-end mt-8" style={{ gap: '12px' }}>
              <button 
                onClick={() => {
                  const defaultColors = { subject: '#1e40af', period: '#e11d48', teacher: '#4b5563', watermark: '#cbd5e1', substitute: '#b45309', overridden: '#9ca3af' };
                  setColors(defaultColors);
                  localStorage.setItem('tkbColors', JSON.stringify(defaultColors));
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold transition-colors border border-gray-300"
                style={{ padding: '10px 16px' }}
              >
                Mặc định
              </button>
              <button 
                onClick={() => setShowColorSettings(false)} 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                style={{ padding: '10px 24px' }}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tùy chọn Lấp giờ / Dạy thay Modal */}
      {pendingSubstitute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80" style={{ padding: '16px 24px' }}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Thay đổi phân công
              </h3>
              <button 
                onClick={() => setPendingSubstitute(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
              {pendingSubstitute.assignmentId === 'CUSTOM' ? (
                <div className="mb-4 space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nhập tên Giáo viên (hoặc môn học):</label>
                  <input
                    type="text"
                    autoFocus
                    value={customSubstituteName}
                    onChange={(e) => setCustomSubstituteName(e.target.value)}
                    placeholder="VD: Phó CN Hường..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none p-3 font-medium"
                  />
                </div>
              ) : (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium">
                  Giáo viên thay thế: <strong>{assignments.find((a: any) => a.id === pendingSubstitute.assignmentId)?.teacher?.name}</strong>
                </div>
              )}

              <div className="space-y-3 mb-6">
                <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700">
                  <input 
                    type="radio" 
                    name="subType"
                    checked={substituteType === 'DAY_THAY'}
                    onChange={() => setSubstituteType('DAY_THAY')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-gray-200">Dạy thay</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Giáo viên gốc vẫn được tính tiết, người dạy thay được thêm vào.</div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700">
                  <input 
                    type="radio" 
                    name="subType"
                    checked={substituteType === 'LAP_GIO'}
                    onChange={() => setSubstituteType('LAP_GIO')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-orange-600 dark:text-orange-400">Lấp giờ</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ghi đè hoàn toàn. Giáo viên gốc bị mất tiết này.</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Ghi chú thêm (Tùy chọn)</label>
                <input 
                  type="text" 
                  value={substituteNote}
                  onChange={(e) => setSubstituteNote(e.target.value)}
                  placeholder="VD: Dạy bù bài 5, Kiểm tra 15p..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  style={{ padding: '10px 12px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const { day, period, session, classId, assignmentId } = pendingSubstitute;
                      if (assignmentId === 'CUSTOM') {
                        if (!customSubstituteName.trim()) {
                          alert("Vui lòng nhập tên người dạy thay!");
                          return;
                        }
                        const finalContent = substituteType === 'DAY_THAY' 
                          ? `[DAY_THAY] ${customSubstituteName.trim()}${substituteNote.trim() ? ' - ' + substituteNote.trim() : ''}`
                          : `[LAP_GIO] ${customSubstituteName.trim()}${substituteNote.trim() ? ' - ' + substituteNote.trim() : ''}`;
                        handleSaveCellNote(day, period, session, classId, finalContent);
                      } else {
                        handleAssign(day, period, session, classId, assignmentId, 'SUBSTITUTE');
                        if (substituteNote.trim()) {
                          handleSaveCellNote(day, period, session, classId, substituteNote.trim());
                        }
                      }
                      setPendingSubstitute(null);
                    }
                  }}
                />
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex justify-end gap-2" style={{ padding: '16px 24px' }}>
              <button 
                onClick={() => setPendingSubstitute(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  const { day, period, session, classId, assignmentId } = pendingSubstitute;
                  if (assignmentId === 'CUSTOM') {
                    if (!customSubstituteName.trim()) {
                      alert("Vui lòng nhập tên người dạy thay!");
                      return;
                    }
                    const finalContent = substituteType === 'DAY_THAY' 
                      ? `[DAY_THAY] ${customSubstituteName.trim()}${substituteNote.trim() ? ' - ' + substituteNote.trim() : ''}`
                      : `[LAP_GIO] ${customSubstituteName.trim()}${substituteNote.trim() ? ' - ' + substituteNote.trim() : ''}`;
                    handleSaveCellNote(day, period, session, classId, finalContent);
                  } else {
                    handleAssign(day, period, session, classId, assignmentId, 'SUBSTITUTE');
                    if (substituteNote.trim()) {
                      handleSaveCellNote(day, period, session, classId, substituteNote.trim());
                    }
                  }
                  setPendingSubstitute(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

