'use client';

import { useState, useTransition, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateTeachingSchedule,
  syncAllAssignmentsPPCT,
  syncAssignmentPPCT,
  getOverrideLogs,
  resetLessonOverride,
} from '@/actions/timetable';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OverrideLog {
  id: string;
  scheduleId: string;
  weekNumber: number;
  className: string;
  subjectName: string;
  teacherName: string;
  dayOfWeek: number;
  period: number;
  fromLessonNum: number;
  toLessonNum: number;
  fromLessonName: string;
  toLessonName: string;
  reason: string | null;
  isProgression: boolean;
  isReverted: boolean;
  createdAt: string;
}

// ─── Modal lý do ép tiết ──────────────────────────────────────────────────────
function OverrideReasonModal({
  info,
  onConfirm,
  onSkip,
}: {
  info: { autoNum: number; newNum: number; lessonName: string };
  onConfirm: (reason: string, isProgression: boolean) => void;
  onSkip: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isProgression, setIsProgression] = useState(false);
  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div style={{
        background: 'white', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 440, padding: '28px 28px 24px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#fff7ed',
            border: '2px solid #fb923c', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, flexShrink: 0
          }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Ép số tiết thủ công</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
              Số tiết TKB tự động: <strong style={{ color: '#16a34a' }}>Tiết {info.autoNum}</strong>
              {' → '}Bạn nhập: <strong style={{ color: '#dc2626' }}>Tiết {info.newNum}</strong>
            </div>
          </div>
        </div>

        {/* Tên bài auto-fill */}
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 13
        }}>
          <span style={{ color: '#15803d', fontWeight: 600 }}>✓ Tên bài đã cập nhật:</span>
          <div style={{ color: '#166534', marginTop: 4, fontStyle: 'italic' }}>"{info.lessonName}"</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Loại ép tiết:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input 
                type="radio" 
                checked={!isProgression} 
                onChange={() => setIsProgression(false)} 
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Ép cục bộ (Đảo giờ)</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Chỉ thay đổi tiết này, các tiết sau giữ nguyên tiến độ.</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <input 
                type="radio" 
                checked={isProgression} 
                onChange={() => setIsProgression(true)} 
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Ép tịnh tiến</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Đẩy tất cả các tiết phía sau tịnh tiến theo số tiết mới này.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Nhập lý do */}
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Lý do ép tiết <span style={{ fontWeight: 400, color: '#9ca3af' }}>(tùy chọn)</span>:
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="VD: Dạy bù bài thi, hoán đổi tiết theo yêu cầu BGH..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db',
            fontSize: 13, color: '#111827', resize: 'vertical', minHeight: 72,
            outline: 'none', fontFamily: 'inherit', lineHeight: 1.5
          }}
          autoFocus
        />

        {/* Nút */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            onClick={onSkip}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb',
              background: 'white', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Bỏ qua lý do
          </button>
          <button
            onClick={() => onConfirm(reason, isProgression)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: '#ea580c', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
            }}
          >
            💾 Lưu + Ghi lý do
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel lịch sử ép tiết ────────────────────────────────────────────────────
function OverrideHistoryPanel({
  logs,
  onRevert,
  onClose,
  weekNumber,
}: {
  logs: OverrideLog[];
  onRevert: (scheduleId: string) => void;
  onClose: () => void;
  weekNumber: number;
}) {
  const dayMap: Record<number, string> = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7' };
  return (
    <div style={{
      background: 'white', border: '1.5px solid #fed7aa', borderRadius: 12,
      overflow: 'hidden', marginBottom: 24,
      boxShadow: '0 4px 20px rgba(234, 88, 12, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', background: 'linear-gradient(135deg, #fff7ed, #fef3c7)',
        borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, color: '#9a3412', fontSize: 15 }}>
              Lịch sử ép tiết thủ công — Tuần {weekNumber}
            </div>
            <div style={{ fontSize: 12, color: '#c2410c' }}>
              {logs.filter(l => !l.isReverted).length} đang hoạt động · {logs.filter(l => l.isReverted).length} đã hoàn tác
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
            color: '#9ca3af', lineHeight: 1, padding: '2px 6px'
          }}
        >×</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Chưa có lần ép tiết nào trong tuần này.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Lớp', 'Môn', 'GV', 'Thứ-Tiết', 'Từ tiết', 'Sang tiết', 'Tên bài mới', 'Loại ép', 'Lý do', 'Thời gian', 'TT', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: log.isReverted ? '#f9fafb' : (idx % 2 === 0 ? 'white' : '#fffbf5'),
                    opacity: log.isReverted ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{log.className}</td>
                  <td style={{ padding: '10px 12px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subjectName}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{log.teacherName.split(' ').slice(-1)[0]}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{dayMap[log.dayOfWeek]} / T.{log.period}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: '#dcfce7', color: '#15803d', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6, fontSize: 12
                    }}>#{log.fromLessonNum}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: '#fee2e2', color: '#b91c1c', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 6, fontSize: 12
                    }}>#{log.toLessonNum}</span>
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>
                    <span title={log.toLessonName}>{log.toLessonName}</span>
                  </td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {log.isProgression ? (
                      <span style={{ color: '#4338ca', fontWeight: 600, fontSize: 12, background: '#e0e7ff', padding: '2px 6px', borderRadius: 4 }}>Tịnh tiến</span>
                    ) : (
                      <span style={{ color: '#ea580c', fontWeight: 600, fontSize: 12, background: '#ffedd5', padding: '2px 6px', borderRadius: 4 }}>Cục bộ</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: 140, color: '#6b7280', fontStyle: log.reason ? 'normal' : 'italic' }}>
                    {log.reason || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(log.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {log.isReverted ? (
                      <span style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                        Đã hoàn tác
                      </span>
                    ) : (
                      <span style={{ background: '#fff7ed', color: '#ea580c', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700, border: '1px solid #fed7aa' }}>
                        🔴 Đang ép
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {!log.isReverted && (
                      <button
                        onClick={() => onRevert(log.scheduleId)}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: '1px solid #2563eb30',
                          background: '#eff6ff', color: '#2563eb', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        ↩ Hoàn tác
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Helper tính số tiết KHGD tuần của môn ────────────────────────────────
function getSubjectPlanWeek(
  subjectName: string,
  grade: number,
  weekNumber: number,
  weeklyPlans: any[],
  schoolPlans: any[]
): number {
  if (!weeklyPlans || !schoolPlans) return 0;

  const wpList = weeklyPlans.filter(
    (wp: any) => wp.grade === grade && wp.subjectName === subjectName
  );

  if (wpList.length > 0) {
    for (const wp of wpList) {
      if (wp.weeklyData && Array.isArray(wp.weeklyData)) {
        const data = wp.weeklyData as (string | number)[];
        if (wp.semester === 1 && weekNumber <= 18 && (weekNumber - 1) < data.length) {
          const val = parseInt(String(data[weekNumber - 1]), 10);
          if (!isNaN(val)) return val;
        } else if (wp.semester === 2 && weekNumber > 18 && (weekNumber - 19) < data.length) {
          const val = parseInt(String(data[weekNumber - 19]), 10);
          if (!isNaN(val)) return val;
        }
      }
    }
  }

  const sp = schoolPlans.find(
    (s: any) => s.grade === grade && s.subjectName === subjectName
  );
  if (sp) {
    const p = weekNumber <= 18 ? sp.periodsPerWeekHk1 : sp.periodsPerWeekHk2;
    return Math.round(p || 0);
  }

  return 0;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DetailedClient({
  weekNumber,
  schoolWeek,
  classes,
  assignments = [],
  slots,
  weeklyPlans = [],
  schoolPlans = [],
  userRole,
}: {
  weekNumber: number;
  schoolWeek?: any;
  classes: any[];
  assignments?: any[];
  slots: any[];
  weeklyPlans?: any[];
  schoolPlans?: any[];
  userRole?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncingClassId, setSyncingClassId] = useState<string | null>(null);

  // Hover & Click state cho popover xem chi tiết môn của lớp
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);
  const [clickedClassId, setClickedClassId] = useState<string | null>(null);

  // Override state
  const [pendingOverride, setPendingOverride] = useState<{
    scheduleId: string;
    autoNum: number;
    newNum: number;
    lessonName: string;
  } | null>(null);
  const [localSlots, setLocalSlots] = useState<any[]>(slots);
  const [showHistory, setShowHistory] = useState(false);
  const [overrideLogs, setOverrideLogs] = useState<OverrideLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Tính ngày theo tuần
  const getDayDate = useCallback((weekNum: number, dayOfWeek: number) => {
    let baseDate: Date;
    if (schoolWeek?.startDate) {
      baseDate = new Date(schoolWeek.startDate);
    } else {
      // Fallback logic
      const firstDayOfSchool = new Date('2026-09-07');
      baseDate = new Date(firstDayOfSchool.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    }
    const targetDate = new Date(baseDate.getTime() + (dayOfWeek - 2) * 24 * 60 * 60 * 1000);
    return targetDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [schoolWeek]);

  useEffect(() => { setLocalSlots(slots); }, [slots]);

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

  // Thống kê số tiết & số môn đã lên lịch TKB
  const classStats = useMemo(() => {
    const stats: Record<string, {
      total: number;
      missing: number;
      ok: number;
      overridden: number;
      subjectsCount: number;
      exactCount: number;
      deficitCount: number;
      surplusCount: number;
      subjectDetails: Array<{
        subjectId: string;
        subjectName: string;
        isSubSubject: boolean;
        totalSlots: number;
        planSlots: number;
        okSlots: number;
        missingSlots: number;
        statusType: 'EXACT' | 'DEFICIT' | 'SURPLUS' | 'UNSCHEDULED';
      }>;
    }> = {};

    classes.forEach((cls: any) => {
      const clsSlots = activeLocalSlots.filter((s: any) => s.assignment?.classId === cls.id);
      const clsAssignments = assignments.filter((a: any) => a.classId === cls.id);

      const missing = clsSlots.filter((s: any) => {
        const ts = s.teachingSchedules?.[0];
        return !ts || ts.actualLessonNum === 0 || !ts.actualLessonName || ts.actualLessonName === 'Chưa cập nhật tên bài' || ts.actualLessonName === 'Chưa có PPCT' || ts.actualLessonName === 'Chưa có tên bài';
      }).length;
      const overridden = clsSlots.filter((s: any) => s.teachingSchedules?.[0]?.isManualOverride).length;

      // Danh sách môn & phân môn thuộc lớp (loại bỏ môn cha có phân môn con)
      const subjectMap = new Map<string, { id: string; name: string; parentSubjectId: string | null }>();

      // 1. Thu thập từ phân công chuyên môn
      clsAssignments.forEach((a: any) => {
        if (a.subject) {
          const hasChildren = a.subject.childSubjects && a.subject.childSubjects.length > 0;
          if (!hasChildren) {
            subjectMap.set(a.subject.id, {
              id: a.subject.id,
              name: a.subject.name,
              parentSubjectId: a.subject.parentSubjectId || null,
            });
          }
        }
      });

      // 2. Thu thập từ TKB slots (đảm bảo không sót môn)
      clsSlots.forEach((s: any) => {
        if (s.assignment?.subject) {
          const sub = s.assignment.subject;
          const hasChildren = sub.childSubjects && sub.childSubjects.length > 0;
          if (!hasChildren && !subjectMap.has(sub.id)) {
            subjectMap.set(sub.id, {
              id: sub.id,
              name: sub.name,
              parentSubjectId: sub.parentSubjectId || null,
            });
          }
        }
      });

      const subjectDetails: Array<{
        subjectId: string;
        subjectName: string;
        isSubSubject: boolean;
        totalSlots: number;
        planSlots: number;
        okSlots: number;
        missingSlots: number;
        statusType: 'EXACT' | 'DEFICIT' | 'SURPLUS' | 'UNSCHEDULED';
      }> = [];

      let exactCount = 0;
      let deficitCount = 0;
      let surplusCount = 0;

      subjectMap.forEach((sub) => {
        const subSlots = clsSlots.filter((s: any) => s.assignment?.subjectId === sub.id);
        const subTotal = subSlots.length; // Số tiết đã lên TKB
        const planSlots = getSubjectPlanWeek(sub.name, cls.grade, weekNumber, weeklyPlans, schoolPlans);

        const subMissing = subSlots.filter((s: any) => {
          const ts = s.teachingSchedules?.[0];
          return !ts || ts.actualLessonNum === 0 || !ts.actualLessonName || ts.actualLessonName === 'Chưa cập nhật tên bài' || ts.actualLessonName === 'Chưa có PPCT' || ts.actualLessonName === 'Chưa có tên bài';
        }).length;
        const subOk = subTotal - subMissing;

        let statusType: 'EXACT' | 'DEFICIT' | 'SURPLUS' | 'UNSCHEDULED' = 'EXACT';

        if (planSlots === 0 && subTotal === 0) {
          statusType = 'UNSCHEDULED';
        } else if (subTotal < planSlots) {
          statusType = 'DEFICIT';
          deficitCount++;
        } else if (subTotal > planSlots) {
          statusType = 'SURPLUS';
          surplusCount++;
        } else {
          statusType = 'EXACT';
          exactCount++;
        }

        subjectDetails.push({
          subjectId: sub.id,
          subjectName: sub.name,
          isSubSubject: !!sub.parentSubjectId,
          totalSlots: subTotal,
          planSlots,
          okSlots: subOk,
          missingSlots: subMissing,
          statusType,
        });
      });

      subjectDetails.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'vi'));

      stats[cls.id] = {
        total: clsSlots.length,
        missing,
        ok: clsSlots.length - missing,
        overridden,
        subjectsCount: subjectMap.size,
        exactCount,
        deficitCount,
        surplusCount,
        subjectDetails,
      };
    });

    return stats;
  }, [classes, activeLocalSlots, assignments, weekNumber, weeklyPlans, schoolPlans]);

  const totalOverridden = Object.values(classStats).reduce((sum, s) => sum + s.overridden, 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLessonNumChange = async (ts: any, newNum: number, slot: any) => {
    if (!ts || newNum === ts.actualLessonNum) return;

    // Gọi server để cập nhật (không truyền tên bài → server tự tra PPCT)
    const res = await updateTeachingSchedule(ts.id, newNum, '');
    if (!res.success) {
      alert('Lỗi: ' + (res as any).error);
      return;
    }

    // Cập nhật UI ngay lập tức
    setLocalSlots(prev => prev.map((s: any) => {
      if (s.id !== slot.id) return s;
      const updatedTs = {
        ...s.teachingSchedules[0],
        actualLessonNum: newNum,
        actualLessonName: (res as any).resolvedLessonName || s.teachingSchedules[0].actualLessonName,
        isManualOverride: (res as any).isOverride || false,
        autoLessonNum: (res as any).autoLessonNum || null,
      };
      return { ...s, teachingSchedules: [updatedTs] };
    }));

    // Nếu là override → hiện modal nhập lý do
    if ((res as any).isOverride) {
      setPendingOverride({
        scheduleId: ts.id,
        autoNum: (res as any).autoLessonNum,
        newNum,
        lessonName: (res as any).resolvedLessonName,
      });
    }
  };

  const handleLessonNameChange = async (ts: any, newName: string) => {
    if (!ts || newName === ts.actualLessonName) return;
    await updateTeachingSchedule(ts.id, ts.actualLessonNum, newName);
  };

  const handleOverrideConfirm = async (reason: string, isProgression: boolean) => {
    if (!pendingOverride) return;
    // Lưu lại reason và loại ép (isProgression)
    await updateTeachingSchedule(pendingOverride.scheduleId, pendingOverride.newNum, pendingOverride.lessonName, reason, isProgression);
    setPendingOverride(null);
    // Cập nhật lại dữ liệu giao diện vì tịnh tiến có thể làm thay đổi nhiều dòng khác
    router.refresh();
    // Refresh logs nếu panel đang mở
    if (showHistory) loadLogs();
  };

  const handleSyncAll = () => {
    const schoolYear = slots?.[0]?.schoolYear;
    if (!schoolYear) { alert('Không có dữ liệu năm học.'); return; }
    if (confirm('Đồng bộ toàn trường sẽ tự động đánh số tiết PPCT cho tất cả lớp. Bạn có chắc chắn?')) {
      startTransition(async () => {
        const res = await syncAllAssignmentsPPCT(schoolYear);
        if (res?.success) { router.refresh(); alert(res.message); }
        else alert('Lỗi: ' + res?.error);
      });
    }
  };

  const handleSyncClass = async (cls: any) => {
    const schoolYear = slots?.[0]?.schoolYear || '2026-2027';
    setSyncingClassId(cls.id);
    const classSlots = slots.filter((s: any) => s.assignment.classId === cls.id);
    const assignmentIds: string[] = Array.from(new Set(classSlots.map((s: any) => s.assignmentId as string)));
    await Promise.all(assignmentIds.map((aId: string) => syncAssignmentPPCT(aId, schoolYear)));
    setSyncingClassId(null);
    router.refresh();
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    const schoolYear = slots?.[0]?.schoolYear || '2026-2027';
    const res = await getOverrideLogs(weekNumber, schoolYear);
    setOverrideLogs((res.logs || []) as OverrideLog[]);
    setLoadingLogs(false);
  };

  const handleShowHistory = async () => {
    setShowHistory(true);
    await loadLogs();
  };

  const handleRevert = async (scheduleId: string) => {
    if (!confirm('Hoàn tác về số tiết TKB tự động?')) return;
    const res = await resetLessonOverride(scheduleId);
    if (res.success) {
      router.refresh();
      await loadLogs();
    } else {
      alert('Lỗi: ' + (res as any).error);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-200" style={{ padding: '24px' }}>
      <style>{`
        .dark .dark\\:bg-gray-800 { background-color: #1f2937 !important; }
        .dark .dark\\:bg-gray-700 { background-color: #374151 !important; }
        .dark .dark\\:bg-gray-900\\/50 { background-color: rgba(17, 24, 39, 0.5) !important; }
        .dark .dark\\:bg-gray-900\\/30 { background-color: rgba(17, 24, 39, 0.3) !important; }
        .dark .dark\\:border-gray-700 { border-color: #374151 !important; }
        .dark .dark\\:text-white { color: #ffffff !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .override-cell input { border-color: #f97316 !important; background: #fff7ed !important; }
      `}</style>

      {/* Modal lý do */}
      {pendingOverride && (
        <OverrideReasonModal
          info={{ autoNum: pendingOverride.autoNum, newNum: pendingOverride.newNum, lessonName: pendingOverride.lessonName }}
          onConfirm={handleOverrideConfirm}
          onSkip={() => { setPendingOverride(null); if (showHistory) loadLogs(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bản Chi Tiết TKB & LBG (Tuần {weekNumber})</h2>
          <p className="text-gray-500 text-sm mt-1">Đồng bộ tự động tên bài từ PPCT · Ghi lại lịch sử ép tiết thủ công.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {userRole !== 'GV' && (
            <button
              onClick={handleSyncAll}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50"
              style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white' }}
            >
              {isPending ? 'Đang đồng bộ...' : '↻ Đồng bộ toàn trường'}
            </button>
          )}
          <button
            onClick={showHistory ? () => setShowHistory(false) : handleShowHistory}
            style={{
              padding: '8px 16px', borderRadius: 6, border: '1.5px solid',
              borderColor: showHistory ? '#ea580c' : (totalOverridden > 0 ? '#fb923c' : '#e5e7eb'),
              background: showHistory ? '#fff7ed' : (totalOverridden > 0 ? '#fff7ed' : 'white'),
              color: showHistory ? '#ea580c' : (totalOverridden > 0 ? '#c2410c' : '#374151'),
              fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            📋 Lịch sử ép tiết
            {totalOverridden > 0 && (
              <span style={{
                background: '#dc2626', color: 'white', borderRadius: '50%',
                width: 20, height: 20, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{totalOverridden}</span>
            )}
          </button>
          <button
            onClick={() => window.open(`/dashboard/timetable/branch?week=${weekNumber}`, '_blank')}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm font-medium"
            style={{ padding: '8px 16px' }}
          >
            Mở TKB Thu gọn
          </button>
          <button
            onClick={() => router.push(`/dashboard/timetable/branch?week=${weekNumber}`)}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm font-medium"
            style={{ padding: '8px 16px' }}
          >
            ← Quay lại
          </button>
        </div>
      </div>

      {/* Panel lịch sử */}
      {showHistory && (
        <OverrideHistoryPanel
          logs={loadingLogs ? [] : overrideLogs}
          onRevert={handleRevert}
          onClose={() => setShowHistory(false)}
          weekNumber={weekNumber}
        />
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {classes.map((cls: any) => {
          const stat = classStats[cls.id] || {
            total: 0, missing: 0, ok: 0, overridden: 0,
            subjectsCount: 0, exactCount: 0, deficitCount: 0, surplusCount: 0, subjectDetails: []
          };
          const isSyncing = syncingClassId === cls.id;

          // Quy tắc màu sắc cấp Lớp:
          // 1. Thiếu (deficitCount > 0) -> ĐỎ
          // 2. Thừa (surplusCount > 0 && deficitCount === 0) -> VÀNG
          // 3. Đủ (tất cả các môn đều đủ chuẩn) -> XANH
          let cardColor = '#16a34a';
          let cardBg = '#f0fdf4';
          let badgeBg = '#dcfce7';
          let badgeColor = '#15803d';
          let badgeBorder = '#86efac';

          if (stat.deficitCount > 0) {
            cardColor = '#dc2626';
            cardBg = '#fef2f2';
            badgeBg = '#fee2e2';
            badgeColor = '#b91c1c';
            badgeBorder = '#fca5a5';
          } else if (stat.surplusCount > 0) {
            cardColor = '#d97706';
            cardBg = '#fffbeb';
            badgeBg = '#fef3c7';
            badgeColor = '#b45309';
            badgeBorder = '#fde68a';
          }

          const showPopover = hoveredClassId === cls.id || clickedClassId === cls.id;

          return (
            <div
              key={cls.id}
              style={{
                background: cardBg, border: `1.5px solid ${cardColor}40`,
                borderRadius: 12, padding: '12px 16px', minWidth: 150,
                display: 'flex', flexDirection: 'column', gap: 6,
                position: 'relative'
              }}
            >
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>{cls.name}</div>

              {/* Nút bấm / Badge hiển thị Lên lịch X/Y */}
              <div
                onMouseEnter={() => setHoveredClassId(cls.id)}
                onMouseLeave={() => setHoveredClassId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setClickedClassId(prev => prev === cls.id ? null : cls.id);
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: badgeColor,
                  background: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  borderRadius: 8,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2,
                  userSelect: 'none'
                }}
                title="Rê chuột hoặc click để xem chi tiết từng môn"
              >
                <span>📋 Lên lịch {stat.exactCount}/{stat.subjectsCount}</span>
                <span style={{ fontSize: 9 }}>▼</span>
              </div>

              {/* Popover danh sách chi tiết từng môn */}
              {showPopover && (
                <div
                  onMouseEnter={() => setHoveredClassId(cls.id)}
                  onMouseLeave={() => setHoveredClassId(null)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    zIndex: 200,
                    width: 300,
                    background: '#ffffff',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 12,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    padding: '14px 16px',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                        Chi tiết lên lịch TKB — Lớp {cls.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                        {stat.exactCount}/{stat.subjectsCount} môn đạt đủ chuẩn KHGD
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setClickedClassId(null); setHoveredClassId(null); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1, padding: 2 }}
                    >×</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 250, overflowY: 'auto', paddingRight: 2 }}>
                    {stat.subjectDetails.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', padding: '8px 0', textAlign: 'center' }}>
                        Chưa có phân công môn học nào
                      </div>
                    ) : (
                      stat.subjectDetails.map((sub: any) => {
                        // Quy tắc màu sắc cấp môn:
                        // - Đủ: XANH (Green)
                        // - Thiếu: ĐỎ (Red)
                        // - Thừa: VÀNG (Yellow)
                        let subBadgeBg = '#f0fdf4';
                        let subBadgeColor = '#15803d';
                        let subBadgeBorder = '#bbf7d0';
                        let noteStr = 'Đủ tiết';

                        if (sub.statusType === 'DEFICIT') {
                          // Thiếu -> ĐỎ
                          subBadgeBg = '#fef2f2';
                          subBadgeColor = '#b91c1c';
                          subBadgeBorder = '#fecaca';
                          noteStr = `Thiếu ${sub.planSlots - sub.totalSlots} tiết`;
                        } else if (sub.statusType === 'SURPLUS') {
                          // Thừa -> VÀNG
                          subBadgeBg = '#fef3c7';
                          subBadgeColor = '#b45309';
                          subBadgeBorder = '#fde68a';
                          noteStr = `Thừa ${sub.totalSlots - sub.planSlots} tiết`;
                        } else if (sub.statusType === 'UNSCHEDULED') {
                          subBadgeBg = '#f9fafb';
                          subBadgeColor = '#6b7280';
                          subBadgeBorder = '#e5e7eb';
                          noteStr = 'Chưa xếp';
                        }

                        const badgeLabel = `${sub.totalSlots}/${sub.planSlots}`;

                        return (
                          <div
                            key={sub.subjectId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              borderRadius: 8,
                              background: sub.statusType === 'EXACT' ? '#f8fafc' : '#ffffff',
                              border: '1px solid #e2e8f0',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.subjectName}
                              </span>
                              {sub.isSubSubject && (
                                <span style={{ fontSize: 10, color: '#64748b' }}>Phân môn</span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: subBadgeBg,
                                color: subBadgeColor,
                                border: `1px solid ${subBadgeBorder}`,
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                              title={`Số tiết lên TKB: ${sub.totalSlots} / Số tiết quy định KHGD: ${sub.planSlots} (${noteStr})`}
                            >
                              {badgeLabel}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSyncClass(cls)}
                disabled={isSyncing}
                style={{
                  marginTop: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid',
                  borderColor: isSyncing ? '#d1d5db' : '#2563eb30',
                  background: isSyncing ? '#f3f4f6' : '#eff6ff',
                  color: isSyncing ? '#9ca3af' : '#2563eb',
                  fontSize: 11, fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                {isSyncing ? (
                  <><span style={{ width: 10, height: 10, border: '1.5px solid #d1d5db', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Đang sync...</>
                ) : '↻ Sync lớp này'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bảng chi tiết */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold">Lớp</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold w-28">Thứ - Ngày</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold w-16 text-center">Tiết</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold">Môn / GV</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold w-28 text-center">Tiết PPCT</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold">Tên bài học</th>
              <th className="border border-gray-200 dark:border-gray-700 py-3 px-4 text-sm font-semibold w-20 text-center">TT</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls: any) => {
              const classSlots = activeLocalSlots.filter((s: any) => s.assignment.classId === cls.id)
                .sort((a: any, b: any) => {
                  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                  if (a.session !== b.session) return a.session === 'SANG' ? -1 : 1;
                  return a.period - b.period;
                });

              if (classSlots.length === 0) return null;

              return classSlots.map((slot: any, idx: number) => {
                const ts = slot.teachingSchedules[0];
                const isOverride = ts?.isManualOverride === true;
                const hasPPCT = ts && ts.actualLessonNum > 0 && ts.actualLessonName && ts.actualLessonName !== 'Chưa cập nhật tên bài' && ts.actualLessonName !== 'Chưa có PPCT' && ts.actualLessonName !== 'Chưa có tên bài';
                const rowBg = isOverride ? '#fff7ed' : (hasPPCT ? undefined : '#fff8f8');

                const isFirstOfClass = idx === 0;
                const isFirstOfDay = idx === 0 || classSlots[idx - 1].dayOfWeek !== slot.dayOfWeek;
                const slotsInDay = classSlots.filter((s: any) => s.dayOfWeek === slot.dayOfWeek).length;

                return (
                  <tr key={slot.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ background: rowBg }}>
                    {isFirstOfClass && (
                      <td rowSpan={classSlots.length} className="border border-gray-200 dark:border-gray-700 p-3 font-bold text-center align-middle bg-gray-50 dark:bg-gray-900/30">
                        {cls.name}
                        {syncingClassId === cls.id && (
                          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                            <span style={{ width: 14, height: 14, border: '2px solid #d1d5db', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                          </div>
                        )}
                      </td>
                    )}
                    {isFirstOfDay && (
                      <td rowSpan={slotsInDay} className="border border-gray-200 dark:border-gray-700 p-2 text-sm text-center align-middle font-semibold bg-gray-50/50 dark:bg-gray-900/20">
                        Thứ {slot.dayOfWeek} <br />
                        <span className="text-gray-500 text-xs font-normal">{getDayDate(weekNumber, slot.dayOfWeek)}</span>
                      </td>
                    )}
                    <td className="border border-gray-200 dark:border-gray-700 p-2 text-sm text-center">
                      <span className="font-medium text-blue-700 dark:text-blue-400">Tiết {slot.period}</span> <br/>
                      <span className="text-gray-500 text-[11px]">({slot.session === 'SANG' ? 'Sáng' : 'Chiều'})</span>
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 p-2 text-sm font-medium">
                      {slot.assignment.subject.name} <span className="font-light opacity-60 mx-0.5">-</span> <span className="text-gray-600 dark:text-gray-400 font-normal">{slot.assignment.teacher.name}</span>
                    </td>

                    {/* Ô nhập số tiết PPCT */}
                    <td className={`border border-gray-200 dark:border-gray-700 p-1 ${isOverride ? 'override-cell' : ''}`}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          key={`num-${slot.id}-${ts?.actualLessonNum}`}
                          defaultValue={ts?.actualLessonNum || 0}
                          onBlur={(e) => {
                            const newVal = parseInt(e.target.value);
                            if (!isNaN(newVal)) handleLessonNumChange(ts, newVal, slot);
                          }}
                          className="w-full p-1 border rounded text-center text-sm dark:bg-gray-700 dark:border-gray-600"
                          style={{
                            borderColor: isOverride ? '#f97316' : (hasPPCT ? '#d1d5db' : '#fca5a5'),
                            background: isOverride ? '#fff7ed' : (hasPPCT ? undefined : '#fff5f5'),
                            fontWeight: isOverride ? 700 : undefined,
                          }}
                          disabled={isPending || !ts}
                          title={isOverride ? `TKB tự động: Tiết ${ts.autoLessonNum} | Đang ép: Tiết ${ts.actualLessonNum}` : undefined}
                        />
                        {isOverride && (
                          <div style={{
                            position: 'absolute', top: -10, right: -2,
                            background: '#ea580c', color: 'white', fontSize: 9,
                            fontWeight: 800, padding: '1px 4px', borderRadius: 4, lineHeight: 1.4,
                            whiteSpace: 'nowrap', zIndex: 10
                          }}>
                            TC
                          </div>
                        )}
                      </div>
                      {isOverride && ts.autoLessonNum && (
                        <div style={{ fontSize: 10, color: '#ea580c', textAlign: 'center', marginTop: 2, fontWeight: 500 }}>
                          TKB: #{ts.autoLessonNum}
                        </div>
                      )}
                    </td>

                    {/* Ô tên bài */}
                    <td className="border border-gray-200 dark:border-gray-700 p-1">
                      <input
                        type="text"
                        key={`name-${slot.id}-${ts?.actualLessonNum}`}
                        defaultValue={ts?.actualLessonName || ''}
                        className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 print:placeholder-transparent"
                        style={{
                          borderColor: isOverride ? '#f97316' : (hasPPCT ? '#d1d5db' : '#fca5a5'),
                          background: isOverride ? '#fff7ed' : (hasPPCT ? '#f9fafb' : '#fff5f5'),
                          color: '#374151',
                          cursor: 'not-allowed'
                        }}
                        placeholder="Chưa cập nhật tên bài"
                        disabled={true}
                        title="Tên bài học được tự động đồng bộ từ PPCT, không thể sửa tay ở đây."
                      />
                    </td>

                    {/* Cột trạng thái */}
                    <td className="border border-gray-200 dark:border-gray-700 p-2 text-center">
                      {isOverride ? (
                        <div>
                          <div style={{ fontSize: 16, color: '#ea580c' }} title={`Ép thủ công: TKB tự động là Tiết ${ts.autoLessonNum}`}>🟠</div>
                          <div style={{ fontSize: 9, color: '#ea580c', fontWeight: 700 }}>THỦ CÔNG</div>
                        </div>
                      ) : hasPPCT ? (
                        <span style={{ color: '#16a34a', fontSize: 18 }} title="Có PPCT">✓</span>
                      ) : (
                        <span style={{ color: '#ef4444', fontSize: 16 }} title="Chưa cập nhật tên bài">⚠</span>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', gap: 20, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
          <span>Có PPCT đúng theo TKB</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ea580c', fontSize: 14 }}>🟠</span>
          <span>Ép thủ công (lệch TKB)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#ef4444', fontSize: 14 }}>⚠</span>
          <span>Chưa cập nhật tên bài (cần sync)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 2, display: 'inline-block' }} />
          <span>Hàng vàng nhạt = đang bị ép</span>
        </div>
        <div style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
          Đổi số tiết → tên bài tự điền · Nhấn "Lịch sử ép tiết" để xem lịch sử và hoàn tác
        </div>
      </div>
    </div>
  );
}
