"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Upload, Search, Download, AlertCircle, FileText, Edit2, X, Check as CheckIcon, ChevronDown, Bot, Copy } from "lucide-react";
import { createAssignment, createAssignments, deleteAssignment, importAssignmentsFromMarkdown, updateAssignment } from "@/actions/assignment";
import * as XLSX from 'xlsx';

export default function AssignmentClient({ 
  initialAssignments,
  teachers,
  subjects,
  classes,
  currentSchoolYear
}: { 
  initialAssignments: any[];
  teachers: any[];
  subjects: any[];
  classes: any[];
  currentSchoolYear: string;
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importResult, setImportResult] = useState<{success: boolean, count?: number, errors?: string[], error?: string} | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ teacherId: "", subjectId: "", classId: "", roleNote: "" });
  
  // Trạng thái cho Form Thêm Nhanh trên dòng (Inline)
  const [inlineAddTeacherId, setInlineAddTeacherId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<{ subjectName: string, classIds: string[], roleNote: string }>({ subjectName: "", classIds: [], roleNote: "" });
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [missingData, setMissingData] = useState<{className: string; missingSubjects: string[]}[]>([]);
  
  // Draggable widget states
  const [position, setPosition] = useState({ x: window.innerWidth - 320 - 20, y: 80 }); // Top-right by default
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Nếu màn hình quá nhỏ hoặc đang load bên SSR thì set default hợp lý
    if (typeof window !== 'undefined') {
      setPosition({ x: Math.max(20, window.innerWidth - 320 - 20), y: 80 });
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lọc danh sách môn học duy nhất (loại bỏ trùng lặp tên do khác khối)
  const uniqueSubjects = Array.from(new Map(subjects.map(s => [s.name, s])).values());

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let contentToImport = "";

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        let md = "| STT | Họ và tên | Chức vụ | Nhiệm vụ phân công giảng dạy |\n";
        md += "| --- | --- | --- | --- |\n";
        jsonData.forEach((row, i) => {
          md += `| ${row["STT"] || i+1} | ${row["Họ và tên"] || row["Họ tên"] || ""} | ${row["Chức vụ"] || "GV"} | ${row["Nhiệm vụ phân công giảng dạy"] || row["Phân công"] || ""} |\n`;
        });
        contentToImport = md;
      } else {
        contentToImport = await file.text();
      }

      const confirmClear = confirm("Bạn có muốn XÓA TOÀN BỘ phân công cũ của năm học này trước khi Import dữ liệu mới không?\n- Chọn OK để Xóa sạch và Import mới.\n- Chọn Cancel để chỉ Import thêm (Có thể ghi đè).");
      
      const res = await importAssignmentsFromMarkdown(contentToImport, currentSchoolYear, confirmClear);
      
      setImportResult(res);
      if (res.success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error: any) {
      setImportResult({ success: false, error: error.message });
    }
    setLoading(false);
    if (e.target) e.target.value = '';
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "STT": 1, "Họ và tên": "Nguyễn Văn A", "Chức vụ": "GV", "Nhiệm vụ phân công giảng dạy": "Toán 6A, 6B" },
      { "STT": 2, "Họ và tên": "Trần Thị B", "Chức vụ": "GV", "Nhiệm vụ phân công giảng dạy": "KHTN 6A, 6B, KHTN 7A" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PhanCong");
    XLSX.writeFile(wb, "Mau_Import_Phan_Cong.xlsx");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa phân công này?")) return;
    const res = await deleteAssignment(id);
    if (res.success) {
      setAssignments(assignments.filter((a: any) => a.id !== id));
    } else {
      alert("Xóa thất bại: " + res.error);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectId || !formData.classId || !formData.teacherId) {
      alert("Vui lòng chọn đầy đủ Giáo viên, Môn học và Lớp.");
      return;
    }

    // Ở Modal, subjectId đang lưu "Tên môn học", ta cần tìm ID thực sự
    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass) return;

    let realSubjectId = formData.subjectId; // mặc định nếu sửa
    if (!editingId || (editingId && !subjects.find(s => s.id === formData.subjectId))) {
      const matchedSubject = subjects.find(s => s.name === formData.subjectId && s.grade === selectedClass.grade);
      if (!matchedSubject) {
        alert(`Môn "${formData.subjectId}" không có trong chương trình khối ${selectedClass.grade}. Vui lòng kiểm tra lại Danh mục môn học.`);
        return;
      }
      realSubjectId = matchedSubject.id;
    }
    
    setIsSubmitting(true);
    let res;
    if (editingId) {
      res = await updateAssignment(editingId, {
        teacherId: formData.teacherId,
        subjectId: realSubjectId,
        classId: formData.classId,
        roleNote: formData.roleNote
      });
    } else {
      res = await createAssignment({
        teacherId: formData.teacherId,
        subjectId: realSubjectId,
        classId: formData.classId,
        roleNote: formData.roleNote,
        schoolYear: currentSchoolYear
      });
    }
    
    if (res.success) {
      if (editingId) {
        setAssignments(assignments.map((a: any) => a.id === editingId ? res.data : a));
      } else {
        setAssignments([...assignments, res.data]);
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      setFormData({ teacherId: "", subjectId: "", classId: "", roleNote: "" });
    } else {
      alert("Lỗi: " + res.error);
    }
    setIsSubmitting(false);
  };
  
  const handleEditClick = (assign: any) => {
    setEditingId(assign.id);
    setFormData({
      teacherId: assign.teacherId,
      subjectId: assign.subject.name, // Dùng tên môn để hiển thị ở Select 
      classId: assign.classId,
      roleNote: assign.roleNote || ""
    });
    setIsAddModalOpen(true);
  };

  const handleInlineSubmit = async (teacherId: string) => {
    if (!inlineFormData.subjectName || inlineFormData.classIds.length === 0) {
      alert("Vui lòng chọn Môn học và ít nhất 1 Lớp.");
      return;
    }

    // Chọn lớp đầu tiên làm chuẩn để xác định khối cho toàn bộ
    const firstSelectedClass = classes.find(c => c.id === inlineFormData.classIds[0]);
    if (!firstSelectedClass) return;

    const matchedSubject = subjects.find(s => s.name === inlineFormData.subjectName && s.grade === firstSelectedClass.grade);
    
    if (!matchedSubject) {
      alert(`Môn "${inlineFormData.subjectName}" không có trong chương trình khối ${firstSelectedClass.grade}. Vui lòng kiểm tra lại Danh mục môn học.`);
      return;
    }
    
    setIsSubmitting(true);
    const res = await createAssignments({
      teacherId,
      subjectId: matchedSubject.id,
      classIds: inlineFormData.classIds,
      roleNote: inlineFormData.roleNote,
      schoolYear: currentSchoolYear
    });
    
    if (res.success) {
      setAssignments([...assignments, ...(res.data || [])]);
      setInlineAddTeacherId(null);
      setInlineFormData({ subjectName: "", classIds: [], roleNote: "" });
      setIsClassDropdownOpen(false);
    } else {
      alert("Lỗi: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleCheckMissing = () => {
    const missing: {className: string; missingSubjects: string[]}[] = [];

    classes.forEach(cls => {
      // Lấy tên các môn học yêu cầu của khối
      const requiredSubjects = subjects
        .filter(s => s.grade === cls.grade)
        .map(s => s.name);
      
      // Lấy tên các môn học đã phân công cho lớp
      const assignedSubjects = assignments
        .filter((a: any) => a.classId === cls.id)
        .map((a: any) => a.subject?.name);
      
      // So sánh theo TÊN môn học (vì lúc import có thể id bị gán nhầm khối do trùng tên)
      const missingForClass = requiredSubjects.filter(name => !assignedSubjects.includes(name));
      
      if (missingForClass.length > 0) {
        missing.push({
          className: cls.name,
          missingSubjects: missingForClass
        });
      }
    });

    // Sắp xếp theo tên lớp
    missing.sort((a, b) => a.className.localeCompare(b.className));
    
    setMissingData(missing);
    setIsMissingModalOpen(true);
  };

  // Lọc theo GV
  const filteredTeachers = teachers.filter((t: any) => {
    const teacherAssignments = assignments.filter((a: any) => a.teacherId === t.id);
    const matchTeacher = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.shortName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchAssignments = teacherAssignments.some((a: any) => 
      a.subject?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.class?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchTeacher || matchAssignments;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "#111827" }}>
      {/* Header */}
      <div 
        className="border-b border-gray-200 bg-gray-50/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        style={{ padding: '24px 32px' }}
      >
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Phân công Chuyên môn</h3>
          <p className="text-sm text-gray-500 mt-1">Danh sách Giáo viên giảng dạy năm học {currentSchoolYear}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, môn, lớp..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none pl-10"
              style={{ padding: '10px 16px' }}
            />
          </div>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ teacherId: "", subjectId: "", classId: "", roleNote: "" });
              setIsAddModalOpen(true);
            }}
            className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            style={{ padding: '10px 20px' }}
          >
            <Plus size={18} /> Thêm phân công
          </button>
          <button 
            onClick={handleCheckMissing}
            className="bg-orange-100 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-200 font-semibold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
            style={{ padding: '10px 16px' }}
          >
            <AlertCircle size={18} /> Rà soát thiếu
          </button>
          <button 
            onClick={() => setIsGuideModalOpen(true)}
            className="bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            style={{ padding: '10px 20px' }}
          >
            <Bot size={18} /> Siêu AI Prompt
          </button>
          
          <button 
            onClick={downloadExcelTemplate}
            className="bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            style={{ padding: '10px 20px' }}
          >
            <Download size={18} /> Mẫu Excel
          </button>
          
          <label className="cursor-pointer bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap" style={{ padding: '10px 20px' }}>
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Upload size={18} />}
            {loading ? "Đang xử lý..." : "Import (Excel/MD)"}
            <input type="file" accept=".md,.txt,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>
      </div>

      {importResult && (
        <div className={`border-b ${importResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`} style={{ padding: '16px 32px' }}>
          <div className="flex items-start gap-3">
            {importResult.success ? <CheckIcon size={20} className="text-green-600 mt-0.5" /> : <AlertCircle size={20} className="text-red-600 mt-0.5" />}
            <div>
              <h4 className={`font-bold ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {importResult.success ? `Đã Import thành công ${importResult.count} phân công!` : 'Có lỗi xảy ra khi Import'}
              </h4>
              {importResult.error && <p className="text-red-600 text-sm mt-1">{importResult.error}</p>}
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="list-disc list-inside text-sm text-amber-700 mt-2 space-y-1">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <tr>
              <th className="font-bold w-16 text-center" style={{ padding: '16px 24px' }}>STT</th>
              <th className="font-bold w-64" style={{ padding: '16px 24px' }}>Giáo viên</th>
              <th className="font-bold" style={{ padding: '16px 24px' }}>Phân công chuyên môn (Môn - Lớp)</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-gray-500" style={{ padding: '48px 24px' }}>
                  <div className="flex flex-col items-center justify-center">
                    <FileText size={48} className="text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-600">Không tìm thấy giáo viên nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher: any, index: number) => {
                const teacherAssignments = assignments.filter((a: any) => a.teacherId === teacher.id);
                
                return (
                  <tr key={teacher.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
                    <td className="text-center font-medium text-gray-500" style={{ padding: '20px 24px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mt-1 shadow-sm border border-indigo-200">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-base">{teacher.name}</p>
                          {teacher.shortName && (
                            <p className="text-sm text-gray-500 font-medium">TKB: {teacher.shortName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div className="flex flex-wrap gap-2 items-center">
                        {teacherAssignments.map((assign: any) => (
                          <div 
                            key={assign.id} 
                            onClick={() => handleEditClick(assign)}
                            className="group flex items-center bg-white border border-indigo-200 hover:border-indigo-400 hover:shadow-sm rounded-lg px-3 py-1.5 cursor-pointer transition-all"
                          >
                            <span className="text-indigo-900 font-semibold text-sm">
                              {assign.subject.name} - <span className="text-indigo-600">{assign.class.name}</span>
                              {assign.roleNote && <span className="text-gray-500 font-normal ml-1">({assign.roleNote})</span>}
                            </span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(assign.id); }} 
                              className="ml-2 text-gray-300 hover:text-red-500 transition-colors"
                              title="Xóa"
                            >
                              <X size={14}/>
                            </button>
                          </div>
                        ))}

                        {inlineAddTeacherId === teacher.id ? (
                          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-300 shadow-sm rounded-lg p-1.5 animate-fade-in">
                            <select 
                              value={inlineFormData.subjectName} 
                              onChange={e => setInlineFormData({...inlineFormData, subjectName: e.target.value})}
                              className="text-sm border-none bg-white rounded focus:ring-2 focus:ring-indigo-500 outline-none px-2 py-1 shadow-sm w-32"
                            >
                              <option value="">Chọn môn</option>
                              {uniqueSubjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <div className="relative">
                              <div 
                                onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                                className="text-sm border-none bg-white rounded cursor-pointer outline-none px-2 py-1.5 shadow-sm w-32 flex items-center justify-between text-gray-700"
                              >
                                {inlineFormData.classIds.length === 0 ? "Chọn lớp..." : `Đã chọn ${inlineFormData.classIds.length}`}
                                <ChevronDown size={14} className="text-gray-400"/>
                              </div>
                              {isClassDropdownOpen && (
                                <div className="absolute z-50 top-full left-0 mt-1 w-48 max-h-48 overflow-y-auto bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-2 gap-1">
                                  {classes.map(c => (
                                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-indigo-50 p-1 rounded transition-colors">
                                      <input 
                                        type="checkbox" 
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                        checked={inlineFormData.classIds.includes(c.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setInlineFormData({...inlineFormData, classIds: [...inlineFormData.classIds, c.id]});
                                          } else {
                                            setInlineFormData({...inlineFormData, classIds: inlineFormData.classIds.filter(id => id !== c.id)});
                                          }
                                        }}
                                      />
                                      {c.name}
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            <input 
                              type="text"
                              placeholder="Phân môn (Tùy chọn)"
                              value={inlineFormData.roleNote}
                              onChange={e => setInlineFormData({...inlineFormData, roleNote: e.target.value})}
                              className="text-sm border-none bg-white rounded focus:ring-2 focus:ring-indigo-500 outline-none px-2 py-1 shadow-sm w-36"
                            />
                            <div className="flex gap-1 ml-1">
                              <button 
                                onClick={() => handleInlineSubmit(teacher.id)} 
                                disabled={isSubmitting}
                                className="bg-indigo-600 text-white rounded hover:bg-indigo-700 p-1 transition-colors disabled:opacity-50"
                                title="Lưu"
                              >
                                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <CheckIcon size={16}/>}
                              </button>
                              <button 
                                onClick={() => { setInlineAddTeacherId(null); setInlineFormData({ subjectName: "", classIds: [], roleNote: "" }); setIsClassDropdownOpen(false); }} 
                                className="bg-gray-200 text-gray-600 rounded hover:bg-gray-300 hover:text-gray-800 p-1 transition-colors"
                                title="Hủy"
                              >
                                <X size={16}/>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setInlineAddTeacherId(teacher.id);
                              setInlineFormData({ subjectName: "", classIds: [], roleNote: "" });
                              setIsClassDropdownOpen(false);
                            }} 
                            className="flex items-center text-sm font-medium text-gray-500 hover:text-indigo-700 bg-gray-50 hover:bg-indigo-50 border border-dashed border-gray-300 hover:border-indigo-300 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            <Plus size={14} className="mr-1" /> Thêm nhanh
                          </button>
                        )}
                        
                        {teacherAssignments.length === 0 && inlineAddTeacherId !== teacher.id && (
                           <span className="text-gray-400 italic text-sm ml-2">Chưa phân công</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa Thủ Công */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-indigo-600 text-white flex justify-between items-center" style={{ padding: '16px 24px' }}>
              <h3 className="font-bold text-lg">{editingId ? "Sửa Phân Công" : "Thêm Phân Công Thủ Công"}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-indigo-100 hover:text-white transition-colors">&times;</button>
            </div>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4" style={{ padding: '24px' }}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Giáo viên</label>
                <select 
                  value={formData.teacherId}
                  onChange={e => setFormData({...formData, teacherId: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ padding: '10px 12px' }}
                  required
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name} {t.shortName ? `(${t.shortName})` : ''}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Môn học</label>
                <select 
                  value={formData.subjectId}
                  onChange={e => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ padding: '10px 12px' }}
                  required
                >
                  <option value="">-- Chọn môn học --</option>
                  {uniqueSubjects.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Lớp</label>
                <select 
                  value={formData.classId}
                  onChange={e => setFormData({...formData, classId: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ padding: '10px 12px' }}
                  required
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú / Phân môn (Tùy chọn)</label>
                <input 
                  type="text"
                  value={formData.roleNote}
                  onChange={e => setFormData({...formData, roleNote: e.target.value})}
                  placeholder="VD: KHTN (Lý)"
                  className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  style={{ padding: '10px 12px' }}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                  style={{ padding: '10px 20px' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-sm transition-colors disabled:opacity-50"
                  style={{ padding: '10px 24px' }}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu phân công"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Hướng dẫn Prompt AI */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-sky-600 text-white flex justify-between items-center" style={{ padding: '16px 24px' }}>
              <div className="flex items-center gap-2">
                <Bot size={24} />
                <h3 className="font-bold text-lg">Siêu Câu Lệnh AI (AI Prompt)</h3>
              </div>
              <button onClick={() => setIsGuideModalOpen(false)} className="text-sky-100 hover:text-white transition-colors">&times;</button>
            </div>
            <div className="overflow-y-auto" style={{ padding: '24px' }}>
              <p className="text-gray-600 mb-4 text-sm">
                Hãy chép câu lệnh dưới đây và gửi cho ChatGPT hoặc Gemini kèm theo dữ liệu phân công thô của trường bạn. AI sẽ tự động dọn dẹp, xử lý chữ viết tắt và tạo ra bảng chuẩn để bạn Import ngay lập tức!
              </p>
              
              <div className="relative">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`Tôi có một đoạn dữ liệu thô về phân công chuyên môn giáo viên. Hãy chuyển nó thành bảng Markdown chuẩn theo đúng cấu trúc sau:

| STT | Họ và tên | Chức vụ | Nhiệm vụ phân công giảng dạy |
| --- | --- | --- | --- |

QUY TẮc BẮT BUỘC:
1. "Nhiệm vụ phân công giảng dạy" CHỈ GHI Tên Môn và Lớp, KHÔNG GHI SỐ TIẾT.
2. Tên môn học THEO ĐÚNG QUY TẮc SAU:
   - Vật lí / Vật lý / Lí / Lý / KHTN Lý → "Khoa học tự nhiên (Lí)"
   - Hóa học / Hóa / KHTN Hóa → "Khoa học tự nhiên (Hóa)"
   - Sinh học / Sinh / KHTN Sinh → "Khoa học tự nhiên (Sinh)"
   - Lịch sử / Sử / LS → "Lịch sử và Địa lí (Ả Lịch sử)"
   - Địa lí / Địa / ĐL → "Lịch sử và Địa lí (Địa lý)"
   - Âm nhạc / AN / Nhạc → "Nghệ thuật (Âm nhạc)"
   - Mỹ thuật / Mì Thuật / MT → "Nghệ thuật (Mĩ thuật)"
   - Nữ ngoại ngữ / Tiếng Anh / Anh → "Tiếng Anh"
   - HĐTNHN / HĐTN / Hoạt động → "HĐTNHN"
   - Văn / Ngữ văn → "Ngữ văn"
   - Toán → "Toán", Tin học / Tin → "Tin học"
   - Công nghệ / CN → "Công nghệ"
   - GDTC / Thể dục → "GDTC", GDCD → "GDCD", GĐĐP / GĐLP → "GĐĐP"
3. Các lớp viết tắt dạng "6a,b" hoặc "6ab" → tách thành "6a, 6b".
4. Tuyệt đối KHÔNG thay đổi tên giáo viên.
5. Chỉ xuất ra duy nhất mã code bảng Markdown, không giải thích thêm.

Dữ liệu thô của tôi là:
[DÁN DỮ LIỆU THÔ CỦA BẠN VÀO ĐÂY]`);
                    alert("Đã copy câu lệnh!");
                  }}
                  className="absolute top-2 right-2 bg-gray-200 hover:bg-sky-100 text-gray-700 hover:text-sky-700 rounded-lg p-2 transition-colors flex items-center gap-1 text-sm font-medium"
                >
                  <Copy size={16} /> Copy
                </button>
                <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono">
{`Tôi có một đoạn dữ liệu thô về phân công chuyên môn giáo viên. Hãy chuyển nó thành bảng Markdown chuẩn theo đúng cấu trúc sau:

| STT | Họ và tên | Chức vụ | Nhiệm vụ phân công giảng dạy |
| --- | --- | --- | --- |

QUY TẮc BẮT BUỘC:
1. "Nhiệm vụ phân công giảng dạy" CHỈ GHI Tên Môn và Lớp, KHÔNG GHI SỐ TIẾT.
2. Tên môn học THEO ĐÚNG QUY TẮc SAU:
   - Vật lí / Vật lý / Lí / Lý / KHTN Lý → "Khoa học tự nhiên (Lí)"
   - Hóa học / Hóa / KHTN Hóa → "Khoa học tự nhiên (Hóa)"
   - Sinh học / Sinh / KHTN Sinh → "Khoa học tự nhiên (Sinh)"
   - Lịch sử / Sử / LS → "Lịch sử và Địa lí (Lịch sử)"
   - Địa lí / Địa / ĐL → "Lịch sử và Địa lí (Địa lý)"
   - Âm nhạc / AN / Nhạc → "Nghệ thuật (Âm nhạc)"
   - Mỹ thuật / Mì Thuật / MT → "Nghệ thuật (Mĩ thuật)"
   - Nữ ngoại ngữ / Tiếng Anh / Anh → "Tiếng Anh"
   - HĐTNHN / HĐTN / Hoạt động → "HĐTNHN"
   - Văn / Ngữ văn → "Ngữ văn"
   - Toán → "Toán", Tin học / Tin → "Tin học"
   - Công nghệ / CN → "Công nghệ"
   - GDTC / Thể dục → "GDTC", GDCD → "GDCD", GĐĐP / GĐLP → "GĐĐP"
3. Các lớp viết tắt dạng "6a,b" hoặc "6ab" → tách thành "6a, 6b".
4. Tuyệt đối KHÔNG thay đổi tên giáo viên.
5. Chỉ xuất ra duy nhất mã code bảng Markdown, không giải thích thêm.

Dữ liệu thô của tôi là:
[DÁN DỮ LIỆU THÔ CỦA BẠN VÀO ĐÂY]`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kiểm tra phân công thiếu */}
      {/* Widget Kiểm tra phân công thiếu dạng nổi (Floating Draggable Widget) */}
      {isMissingModalOpen && (
        <div 
          style={{ left: position.x, top: position.y }}
          className="fixed z-[9999] w-80 bg-white/95 backdrop-blur-md border border-orange-200 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh]"
        >
          {/* Header (Drag Handle) */}
          <div 
            onMouseDown={handleMouseDown}
            className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200 px-4 py-3 cursor-move flex justify-between items-center select-none"
          >
            <h3 className="text-sm font-extrabold text-orange-900 flex items-center gap-1.5 tracking-tight">
              <AlertCircle size={16} className="text-orange-600"/> 
              RÀ SOÁT PHÂN CÔNG
            </h3>
            <button 
              onClick={() => setIsMissingModalOpen(false)} 
              className="text-orange-400 hover:text-red-500 hover:bg-orange-200/50 p-1 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 text-[12px]">
            {missingData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-emerald-600">
                <CheckIcon size={24} className="mb-2" />
                <span className="font-bold text-sm">Tuyệt vời! Đã đủ phân công.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-orange-50 text-orange-800 text-xs px-3 py-2 rounded-lg mb-4 font-medium border border-orange-100">
                  Phát hiện <strong>{missingData.length}</strong> lớp thiếu phân công
                </div>
                {missingData.map((item, idx) => (
                  <div key={idx} className="border border-red-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-red-50 text-red-800 font-bold px-3 py-2 flex justify-between items-center border-b border-red-100">
                      <span>Lớp {item.className}</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">
                        Thiếu {item.missingSubjects.length}
                      </span>
                    </div>
                    <div className="p-3 bg-white flex flex-wrap gap-1.5">
                      {item.missingSubjects.map((sub, sIdx) => (
                        <span key={sIdx} className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1 rounded text-[11px] font-medium">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


