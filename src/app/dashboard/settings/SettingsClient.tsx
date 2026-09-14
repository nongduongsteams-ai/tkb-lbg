"use client";

import { useState, useEffect } from "react";
import { getSchoolWeeks, autoGenerateWeeks, updateSchoolWeek, deleteSchoolWeek, appendSchoolWeek } from "@/actions/schoolWeek";
import { Plus, Edit2, Trash2, Settings2, X, RefreshCw, Save, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSupportedGrades, saveSupportedGradesList, getPreparationDay, savePreparationDay } from "@/actions/config";

// Helper để format date cho input type="date"
const formatDateForInput = (dateStr: string | Date) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateStr: string | Date) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function SettingsClient() {
  const [schoolYear, setSchoolYear] = useState("2025-2026");
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoStartDate, setAutoStartDate] = useState("");
  const [autoTotalWeeks, setAutoTotalWeeks] = useState(35);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<any>(null);

  const fetchWeeks = async () => {
    setLoading(true);
    const res = await getSchoolWeeks(schoolYear);
    if (res.success && res.data) {
      const sortedWeeks = res.data.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setWeeks(sortedWeeks);
    }
    setLoading(false);
  };

  const [supportedGrades, setSupportedGrades] = useState<number[]>([]);
  const [prepDay, setPrepDay] = useState<number>(5); // Default Thứ 5
  
  const fetchSupportedGrades = async () => {
    const grades = await getSupportedGrades();
    setSupportedGrades(grades);
  };

  const fetchPrepDay = async () => {
    const day = await getPreparationDay();
    setPrepDay(day);
  };

  useEffect(() => {
    fetchWeeks();
    fetchSupportedGrades();
    fetchPrepDay();
  }, [schoolYear]);

  const handleToggleGrade = (grade: number) => {
    setSupportedGrades(prev => {
      if (prev.includes(grade)) {
        return prev.filter(g => g !== grade).sort((a, b) => a - b);
      } else {
        return [...prev, grade].sort((a, b) => a - b);
      }
    });
  };

  const handleSaveGrades = async () => {
    setLoading(true);
    if (supportedGrades.length === 0) {
      alert("Bạn phải chọn ít nhất 1 khối lớp!");
      setLoading(false);
      return;
    }
    const res = await saveSupportedGradesList(supportedGrades);
    if (res.success) {
      alert("Lưu cấu hình khối lớp thành công!");
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const handleSavePrepDay = async () => {
    setLoading(true);
    const res = await savePreparationDay(prepDay);
    if (res.success) {
      alert("Lưu ngày soạn bài thành công!");
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const handleAutoGenerate = async () => {
    if (!autoStartDate) {
      alert("Vui lòng chọn ngày bắt đầu!");
      return;
    }
    setLoading(true);
    const res = await autoGenerateWeeks(schoolYear, autoStartDate, autoTotalWeeks);
    if (res.success) {
      setIsAutoModalOpen(false);
      fetchWeeks();
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const handleAppendWeek = async () => {
    setLoading(true);
    const res = await appendSchoolWeek(schoolYear);
    if (res.success) {
      fetchWeeks();
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateSchoolWeek(editingWeek.id, {
      weekNumber: parseInt(editingWeek.weekNumber),
      startDate: editingWeek.startDate,
      endDate: editingWeek.endDate,
      semester: parseInt(editingWeek.semester),
      isBreak: editingWeek.isBreak,
      note: editingWeek.note,
      isShiftNext: editingWeek.isShiftNext,
    });
    
    if (res.success) {
      setIsEditModalOpen(false);
      fetchWeeks();
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tuần này?")) return;
    setLoading(true);
    const res = await deleteSchoolWeek(id);
    if (res.success) {
      fetchWeeks();
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  };

  const openEditModal = (week: any) => {
    setEditingWeek({
      ...week,
      weekNumber: week.weekNumber,
      startDate: formatDateForInput(week.startDate),
      endDate: formatDateForInput(week.endDate),
      isShiftNext: false,
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cấu hình Khối lớp */}
      <div className="bg-[#1a1c23] rounded-xl border border-[#2d3748] overflow-hidden" style={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Layers className="w-5 h-5 mr-2 text-[#DFE278]" />
              Cấu hình Khối lớp (Trường Liên Cấp)
            </h3>
            <p className="text-[#a0aec0] text-sm mt-1">Đánh dấu các khối lớp cho phép tham gia vào dữ liệu môn học & thời khóa biểu trong hệ thống.</p>
          </div>
          <button
            onClick={handleSaveGrades}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-[#DFE278] hover:bg-[#c8cc6c] text-[#1a1c23] text-sm font-medium rounded-md transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Lưu cài đặt
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
            <button 
              key={grade}
              onClick={() => handleToggleGrade(grade)}
              disabled={loading}
              className={`flex justify-between items-center p-3 rounded-lg border-2 text-left transition-all ${
                supportedGrades.includes(grade) 
                  ? "border-[#DFE278] bg-[#DFE278]/10 text-white" 
                  : "border-[#2d3748] bg-[#1a1c23] text-[#a0aec0] hover:border-[#4a5568]"
              }`}
            >
              <span className="font-medium">Lớp {grade}</span>
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${supportedGrades.includes(grade) ? "bg-[#DFE278] border-[#DFE278]" : "border-[#4a5568]"}`}>
                {supportedGrades.includes(grade) && <div className="w-2 h-2 bg-[#1a1c23] rounded-sm" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cấu hình Ngày soạn bài */}
      <div className="bg-[#1a1c23] rounded-xl border border-[#2d3748] overflow-hidden" style={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-[#DFE278]" />
              Ngày soạn bài mặc định
            </h3>
            <p className="text-[#a0aec0] text-sm mt-1">Cài đặt ngày trong tuần (của tuần trước) được dùng làm Ngày soạn Kế hoạch bài dạy cho tuần học hiện tại.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={prepDay}
              onChange={(e) => setPrepDay(parseInt(e.target.value))}
              disabled={loading}
              className="bg-[#2d3748] text-white border border-[#4a5568] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DFE278]"
            >
              {[2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>Thứ {d}</option>
              ))}
              <option value={8}>Chủ nhật</option>
            </select>
            <button
              onClick={handleSavePrepDay}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-[#DFE278] hover:bg-[#c8cc6c] text-[#1a1c23] text-sm font-medium rounded-md transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Lưu cài đặt
            </button>
          </div>
        </div>
      </div>

      {/* Cấu hình thời gian tuần học */}
      <div className="bg-[#1a1c23] rounded-xl border border-[#2d3748] overflow-hidden" style={{ padding: "24px" }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center">
              <Settings2 className="w-5 h-5 mr-2 text-[#DFE278]" />
              Cấu hình Thời gian năm học
            </h3>
            <p className="text-[#a0aec0] text-sm mt-1">Cài đặt ngày bắt đầu và kết thúc cho từng tuần trong năm học.</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="bg-[#2d3748] text-white border border-[#4a5568] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DFE278]"
            >
              <option value="2024-2025">Năm học 2024-2025</option>
              <option value="2025-2026">Năm học 2025-2026</option>
              <option value="2026-2027">Năm học 2026-2027</option>
            </select>
            <button
              onClick={handleAppendWeek}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-[#2d3748] hover:bg-[#374151] text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm tuần cuối
            </button>
            <button
              onClick={() => setIsAutoModalOpen(true)}
              className="flex items-center px-4 py-2 bg-[#DFE278] hover:bg-[#c8cc6c] text-[#1a1c23] text-sm font-medium rounded-md transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo tự động
            </button>
            <button
              onClick={fetchWeeks}
              className="p-2 bg-[#2d3748] hover:bg-[#374151] text-white rounded-md transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Bảng danh sách tuần */}
        <div className="overflow-x-auto rounded-lg border border-[#2d3748]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#a0aec0] uppercase bg-[#2d3748]">
              <tr>
                <th className="px-6 py-3 font-medium">Tuần</th>
                <th className="px-6 py-3 font-medium">Từ ngày</th>
                <th className="px-6 py-3 font-medium">Đến ngày</th>
                <th className="px-6 py-3 font-medium text-center">Học kỳ</th>
                <th className="px-6 py-3 font-medium text-center">Nghỉ lễ/Tết</th>
                <th className="px-6 py-3 font-medium">Ghi chú</th>
                <th className="px-6 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {weeks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#a0aec0]">
                    Chưa có cấu hình tuần nào cho năm học {schoolYear}. <br />
                    Hãy nhấn "Tạo tự động" để sinh dữ liệu.
                  </td>
                </tr>
              ) : (
                weeks.map((week) => (
                  <tr key={week.id} className="border-b border-[#2d3748] hover:bg-[#2d3748]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {week.isBreak ? <span className="text-red-400">Nghỉ lễ/Tết</span> : `Tuần ${week.weekNumber}`}
                    </td>
                    <td className="px-6 py-4 text-[#e2e8f0]">{formatDateForDisplay(week.startDate)}</td>
                    <td className="px-6 py-4 text-[#e2e8f0]">{formatDateForDisplay(week.endDate)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-1 text-xs rounded-full font-medium",
                        week.semester === 1 ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300"
                      )}>
                        Kỳ {week.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {week.isBreak ? (
                        <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-red-500/20 text-red-400">Có</span>
                      ) : (
                        <span className="text-[#718096]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#a0aec0]">{week.note || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(week)}
                        className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded mr-2 transition-colors"
                        title="Chỉnh sửa thủ công"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(week.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo tự động */}
      {isAutoModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" style={{ padding: '24px' }}>
          <div className="bg-[#1a1c23] rounded-xl border border-[#2d3748] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2d3748] bg-[#2d3748]/30" style={{ padding: '16px 24px' }}>
              <h3 className="text-lg font-semibold text-white">Tạo lịch tuần tự động</h3>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-[#a0aec0] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4" style={{ padding: '24px' }}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e2e8f0]">Năm học</label>
                <input 
                  type="text" 
                  value={schoolYear} 
                  disabled 
                  className="w-full bg-[#2d3748]/50 border border-[#4a5568] rounded-md text-sm text-[#a0aec0] cursor-not-allowed" 
                  style={{ padding: '8px 12px' }}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e2e8f0]">Ngày bắt đầu (Tuần 1)</label>
                <input 
                  type="date" 
                  value={autoStartDate}
                  onChange={(e) => setAutoStartDate(e.target.value)}
                  className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]" 
                  style={{ padding: '8px 12px' }}
                />
                <p className="text-xs text-[#a0aec0]">Hệ thống sẽ tự động cộng 7 ngày cho các tuần tiếp theo.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#e2e8f0]">Số tuần cần tạo</label>
                <input 
                  type="number" 
                  min={1} 
                  max={52}
                  value={autoTotalWeeks}
                  onChange={(e) => setAutoTotalWeeks(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]" 
                  style={{ padding: '8px 12px' }}
                />
              </div>
            </div>
            
            <div className="border-t border-[#2d3748] bg-[#2d3748]/30 flex justify-end space-x-3" style={{ padding: '16px 24px' }}>
              <button 
                onClick={() => setIsAutoModalOpen(false)}
                className="text-sm font-medium text-[#a0aec0] hover:text-white transition-colors"
                style={{ padding: "8px 16px" }}
              >
                Hủy
              </button>
              <button 
                onClick={handleAutoGenerate}
                disabled={loading}
                className="flex items-center bg-[#DFE278] hover:bg-[#c8cc6c] text-[#1a1c23] text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                style={{ padding: "8px 16px" }}
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Thực hiện
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa thủ công */}
      {isEditModalOpen && editingWeek && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" style={{ padding: '24px' }}>
          <div className="bg-[#1a1c23] rounded-xl border border-[#2d3748] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#2d3748] bg-[#2d3748]/30" style={{ padding: '16px 24px' }}>
              <h3 className="text-lg font-semibold text-white">Chỉnh sửa Tuần {editingWeek.weekNumber}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#a0aec0] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdate}>
              <div className="space-y-4" style={{ padding: '24px' }}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e2e8f0]">Số thứ tự Tuần</label>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="number" 
                      required
                      min={1}
                      max={150}
                      disabled={editingWeek.isBreak}
                      value={editingWeek.weekNumber}
                      onChange={(e) => setEditingWeek({...editingWeek, weekNumber: parseInt(e.target.value) || 1})}
                      className="w-1/3 bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278] disabled:opacity-50" 
                      style={{ padding: '8px 12px' }}
                    />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editingWeek.isShiftNext}
                        disabled={editingWeek.isBreak}
                        onChange={(e) => setEditingWeek({...editingWeek, isShiftNext: e.target.checked})}
                        className="w-4 h-4 rounded border-[#4a5568] bg-[#2d3748] text-[#DFE278] focus:ring-[#DFE278] disabled:opacity-50"
                      />
                      <span className="text-sm font-medium text-[#e2e8f0]">Tịnh tiến số thứ tự các tuần sau</span>
                    </label>
                  </div>
                  {editingWeek.isBreak && <p className="text-xs text-yellow-500">Đây là tuần nghỉ lễ, số thứ tự tuần không thể thay đổi và không tham gia vào trình tự.</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e2e8f0]">Từ ngày</label>
                    <input 
                      type="date" 
                      required
                      value={editingWeek.startDate}
                      onChange={(e) => setEditingWeek({...editingWeek, startDate: e.target.value})}
                      className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]" 
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e2e8f0]">Đến ngày</label>
                    <input 
                      type="date" 
                      required
                      value={editingWeek.endDate}
                      onChange={(e) => setEditingWeek({...editingWeek, endDate: e.target.value})}
                      className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]" 
                      style={{ padding: '8px 12px' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e2e8f0]">Học kỳ</label>
                    <select 
                      value={editingWeek.semester}
                      onChange={(e) => setEditingWeek({...editingWeek, semester: e.target.value})}
                      className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]"
                      style={{ padding: '8px 12px' }}
                    >
                      <option value="1">Học kỳ 1</option>
                      <option value="2">Học kỳ 2</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2 pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editingWeek.isBreak}
                        onChange={(e) => setEditingWeek({...editingWeek, isBreak: e.target.checked})}
                        className="w-4 h-4 rounded border-[#4a5568] bg-[#2d3748] text-[#DFE278] focus:ring-[#DFE278]"
                      />
                      <span className="text-sm font-medium text-[#e2e8f0]">Tuần nghỉ (Lễ/Tết)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e2e8f0]">Ghi chú (Tùy chọn)</label>
                  <input 
                    type="text" 
                    placeholder="Vd: Nghỉ Tết Nguyên Đán"
                    value={editingWeek.note || ""}
                    onChange={(e) => setEditingWeek({...editingWeek, note: e.target.value})}
                    className="w-full bg-[#2d3748] border border-[#4a5568] rounded-md text-sm text-white focus:outline-none focus:border-[#DFE278]" 
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              </div>
              
              <div className="border-t border-[#2d3748] bg-[#2d3748]/30 flex justify-end space-x-3" style={{ padding: '16px 24px' }}>
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-sm font-medium text-[#a0aec0] hover:text-white transition-colors"
                  style={{ padding: "8px 16px" }}
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex items-center bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  style={{ padding: "8px 16px" }}
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
