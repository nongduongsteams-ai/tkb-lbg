"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, Check, BookOpen, Layers, Upload, Save, AlignLeft, Download, Settings2, Sparkles, Copy } from "lucide-react";
import { createSubject, updateSubject, deleteSubject } from "@/actions/subject";
import { getCurriculums, saveCurriculums } from "@/actions/curriculum";

export default function SubjectClient({ 
  initialSubjects,
  supportedGrades = [6, 7, 8, 9],
  userActions = []
}: { 
  initialSubjects: any[];
  supportedGrades?: number[];
  userActions?: string[];
}) {
  const [activeTab, setActiveTab] = useState<'subjects' | 'curriculums'>('subjects');
  
  // ================= SUBJECTS STATE =================
  const [subjects, setSubjects] = useState(initialSubjects);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  
  // ================= CURRICULUMS STATE =================
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [lessons, setLessons] = useState<any[]>([]);

  // Everyone can manage subjects they can see in the PPCT tab.
  // The server already filters the visible subjects based on their assignments.
  const canManagePPCT = true;
  const canManageSubjects = userActions.includes('MANAGE_SUBJECTS') || userActions.includes('ADMIN');
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Group subjects by grade for display
  const grades = supportedGrades;

  // Fetch curriculums when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setLessons([]);
      return;
    }
    const fetchPPCT = async () => {
      setLoadingCurriculum(true);
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (subject) {
        const result = await getCurriculums(subject.id, subject.grade);
        if (result.success) {
          setLessons(result.data || []);
        }
      }
      setLoadingCurriculum(false);
    };
    fetchPPCT();
  }, [selectedSubjectId, subjects]);

  const handleAddLesson = () => {
    const nextLessonNum = lessons.length > 0 ? Math.max(...lessons.map(l => l.lessonNumber)) + 1 : 1;
    setLessons([...lessons, { id: `temp-${Date.now()}`, lessonNumber: nextLessonNum, lessonName: "", note: "" }]);
  };

  const handleUpdateLesson = (index: number, field: string, value: any) => {
    const newLessons = [...lessons];
    newLessons[index] = { ...newLessons[index], [field]: value };
    setLessons(newLessons);
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const handleSaveCurriculum = async () => {
    if (!selectedSubjectId) return;
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    setLoading(true);
    const result = await saveCurriculums(subject.id, subject.grade, lessons.map(l => ({
      lessonNumber: parseInt(l.lessonNumber),
      lessonName: l.lessonName,
      note: l.note || ""
    })));

    if (result.success) {
      alert("Đã lưu Phân phối chương trình thành công!");
    } else {
      alert("Lỗi khi lưu: " + result.error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseMarkdownTable(text);
      };
      reader.readAsText(file);
    } else {
      // PDF, DOCX, XLSX
      setLoadingCurriculum(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/extract-markdown', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
           parseMarkdownTable(data.markdown);
        } else {
           alert("Lỗi trích xuất dữ liệu: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Upload error", err);
        alert("Lỗi khi tải file lên máy chủ!");
      }
      setLoadingCurriculum(false);
    }
    
    e.target.value = ''; // Reset input
  };

  const parseMarkdownTable = (text: string) => {
    const lines = text.split('\n');
    const newLessons: any[] = [];
    let isParsingTable = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith('|')) continue;
      
      // Skip separator line
      if (trimmedLine.includes('---')) {
        isParsingTable = true;
        continue;
      }

      // Skip header line if we haven't seen separator
      if (!isParsingTable && trimmedLine.includes('TT')) {
        continue;
      }

      if (isParsingTable) {
        const columns = trimmedLine.split('|').map(c => c.trim()).filter((_, index, arr) => index > 0 && index < arr.length - 1);
        if (columns.length >= 3) {
          const lessonNumber = parseInt(columns[1]); // Cột 2: Tiết PPCT
          const lessonName = columns[2];             // Cột 3: Tên bài học
          const note = columns.length >= 4 ? columns[3] : ""; // Cột 4: Ghi chú

          if (!isNaN(lessonNumber) && lessonName) {
            newLessons.push({
              id: `temp-${Date.now()}-${lessonNumber}`,
              lessonNumber,
              lessonName,
              note
            });
          }
        }
      }
    }

    if (newLessons.length > 0) {
      // Sắp xếp theo Tiết PPCT
      newLessons.sort((a, b) => a.lessonNumber - b.lessonNumber);
      setLessons(newLessons);
      alert(`Đã import thành công ${newLessons.length} tiết từ file!`);
    } else {
      alert("Không tìm thấy dữ liệu PPCT trong file. Vui lòng đảm bảo file đúng định dạng bảng Markdown.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "#111827" }}>
      {/* Header & Tabs */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Môn học & Phân phối chương trình</h3>
          <p className="text-sm text-gray-500">Quản lý danh sách môn học và lộ trình bài giảng (PPCT) cho từng khối.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`rounded-xl font-semibold text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'subjects' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-indigo-600'
            }`}
            style={{ padding: '12px 24px' }}
          >
            <BookOpen size={18} /> Quản lý Môn học
          </button>
          <button
            onClick={() => setActiveTab('curriculums')}
            className={`rounded-xl font-semibold text-sm transition-all flex items-center gap-2.5 ${
              activeTab === 'curriculums' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-indigo-600'
            }`}
            style={{ padding: '12px 24px' }}
          >
            <Layers size={18} /> Phân phối chương trình (PPCT)
          </button>
        </div>
      </div>

      {/* ===================== TAB: SUBJECTS ===================== */}
      {activeTab === 'subjects' && (
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-bold text-gray-800">Danh mục Môn học toàn trường</h4>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 italic">
                Đồng bộ tự động từ Kế hoạch nhà trường
              </div>
              {canManageSubjects && (
                <button
                  onClick={() => {
                    setEditingSubject(null);
                    setIsSubjectModalOpen(true);
                  }}
                  className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors"
                  style={{ padding: '8px 16px' }}
                >
                  <Plus size={16} /> Thêm môn học
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            {/* Helper function to render a grade card */}
            {(() => {
              const renderGradeCard = (grade: number) => {
                const gradeSubjects = subjects.filter(s => s.grade === grade);
                
                // Group subjects for display
                const groups: any[] = [];
                gradeSubjects.forEach(subject => {
                  const pName = subject.planName || (subject.name.includes("(") ? subject.name.split("(")[0].trim() : subject.name);
                  let group = groups.find(g => g.name === pName);
                  if (!group) {
                    group = { name: pName, subjects: [], totalUploaded: 0, targetCount: subject.targetCount };
                    groups.push(group);
                  }
                  group.subjects.push(subject);
                  group.totalUploaded += (subject.uploadedCount || 0);
                });

                return (
                  <div key={grade} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                      <h5 className="font-bold text-gray-700">Khối {grade}</h5>
                    </div>
                    <div className="p-4 flex-1 flex flex-col gap-4">
                      {gradeSubjects.length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-4">Chưa có môn học</p>
                      ) : (
                        groups.map(group => (
                          <div key={group.name} className={group.subjects.length > 1 ? "border-2 border-indigo-100 rounded-xl p-3 bg-white" : ""}>
                            {group.subjects.length > 1 && (
                              <div className="flex justify-between items-center mb-3 pb-2 border-b border-indigo-50">
                                <span className="font-bold text-indigo-800">{group.name}</span>
                                {group.targetCount !== undefined ? (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${group.totalUploaded === group.targetCount && group.targetCount > 0 ? 'bg-green-100 text-green-700' : (group.targetCount === 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700')}`}>
                                    Tổng PPCT: {group.totalUploaded}/{group.targetCount}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    Tổng PPCT: {group.totalUploaded}/?
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col gap-3">
                              {group.subjects.map((subject: any) => (
                                <div key={subject.id} className="border border-gray-100 rounded-lg p-3 hover:shadow-md transition-shadow bg-gray-50">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: subject.color }}></div>
                                        <span className="font-semibold text-gray-800">{subject.name}</span>
                                      </div>
                                      {group.subjects.length === 1 ? (
                                        <div>
                                          {subject.targetCount !== undefined ? (
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${subject.uploadedCount === subject.targetCount && subject.targetCount > 0 ? 'bg-green-100 text-green-700' : (subject.targetCount === 0 ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700')}`}>
                                              PPCT: {subject.uploadedCount || 0}/{subject.targetCount}
                                            </span>
                                          ) : (
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                              PPCT: {subject.uploadedCount || 0}/?
                                            </span>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                    {/* Action button */}
                                    {canManageSubjects && (
                                      <button 
                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                        title="Cài đặt môn học"
                                        onClick={() => {
                                          setEditingSubject(subject);
                                          setIsSubjectModalOpen(true);
                                        }}
                                      >
                                        <Settings2 size={16} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              };

              const thGrades = grades.filter(g => g <= 5);
              const thcsGrades = grades.filter(g => g >= 6 && g <= 9);
              const thptGrades = grades.filter(g => g >= 10);

              const getGridColsClass = (len: number) => {
                if (len >= 5) return 'lg:grid-cols-5 md:grid-cols-3';
                if (len === 4) return 'lg:grid-cols-4 md:grid-cols-2';
                if (len === 3) return 'lg:grid-cols-3 md:grid-cols-2';
                if (len === 2) return 'lg:grid-cols-2';
                return 'grid-cols-1';
              };

              return (
                <>
                  {thGrades.length > 0 && (
                    <div>
                      <h5 className="font-bold text-gray-500 mb-3 uppercase text-xs tracking-wider">Cấp Tiểu học</h5>
                      <div className={`grid grid-cols-1 gap-6 ${getGridColsClass(thGrades.length)}`}>
                        {thGrades.map(renderGradeCard)}
                      </div>
                    </div>
                  )}
                  
                  {thcsGrades.length > 0 && (
                    <div>
                      <h5 className="font-bold text-gray-500 mb-3 uppercase text-xs tracking-wider">Cấp Trung học Cơ sở</h5>
                      <div className={`grid grid-cols-1 gap-6 ${getGridColsClass(thcsGrades.length)}`}>
                        {thcsGrades.map(renderGradeCard)}
                      </div>
                    </div>
                  )}
                  
                  {thptGrades.length > 0 && (
                    <div>
                      <h5 className="font-bold text-gray-500 mb-3 uppercase text-xs tracking-wider">Cấp Trung học Phổ thông</h5>
                      <div className={`grid grid-cols-1 gap-6 ${getGridColsClass(thptGrades.length)}`}>
                        {thptGrades.map(renderGradeCard)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== TAB: CURRICULUMS ===================== */}
      {activeTab === 'curriculums' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5 flex-1">
              <label className="font-semibold text-gray-700 whitespace-nowrap">Môn học:</label>
              <select
                className="border border-gray-300 rounded-xl px-5 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 font-medium min-w-[250px] bg-white shadow-sm"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="">-- Vui lòng chọn môn học --</option>
                {grades
                  .filter(grade => selectedGradeFilter === "" || grade === parseInt(selectedGradeFilter))
                  .map(grade => {
                  const gradeSubs = subjects.filter(s => s.grade === grade);
                  if (gradeSubs.length === 0) return null;
                  return (
                    <optgroup key={grade} label={`Khối ${grade}`}>
                      {gradeSubs.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Khối {s.grade})</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>

              <label className="font-semibold text-gray-700 whitespace-nowrap">Khối lớp:</label>
              <select
                className="border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 font-medium bg-white shadow-sm"
                value={selectedGradeFilter}
                onChange={(e) => {
                  const newGrade = e.target.value;
                  setSelectedGradeFilter(newGrade);
                  
                  if (selectedSubjectId && newGrade !== "") {
                    const currentSub = subjects.find(s => s.id === selectedSubjectId);
                    if (currentSub) {
                      const match = subjects.find(s => s.name === currentSub.name && s.grade === parseInt(newGrade));
                      if (match) {
                        setSelectedSubjectId(match.id);
                      } else {
                        setSelectedSubjectId("");
                      }
                    }
                  }
                }}
              >
                <option value="">-- Tất cả --</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>Khối {grade}</option>
                ))}
              </select>
            </div>
            
            {selectedSubjectId && (
              <div className="flex items-center gap-4">
                <a 
                  href="/api/download-template" 
                  download 
                  className="bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors"
                  style={{ padding: '10px 20px' }}
                >
                  <Download size={18} /> Tải File Mẫu
                </a>
                <button 
                  onClick={() => setShowPromptModal(true)}
                  className="bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors"
                  style={{ padding: '10px 20px' }}
                >
                  <Sparkles size={18} /> Lấy Prompt AI
                </button>
                {canManagePPCT && (
                  <>
                    <label className="cursor-pointer bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors" style={{ padding: '10px 20px' }}>
                      <Upload size={18} /> Nhập từ File
                      <input type="file" accept=".md,.txt,.pdf,.docx,.xlsx,.xls" className="hidden" onChange={handleFileUpload} disabled={loadingCurriculum} />
                    </label>
                    <button
                      onClick={handleSaveCurriculum}
                      disabled={loading}
                      className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      style={{ padding: '10px 24px' }}
                    >
                      <Save size={18} /> Lưu PPCT
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            {!selectedSubjectId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <AlignLeft size={48} className="mb-4 opacity-50" />
                <p className="text-lg">Hãy chọn một môn học ở thanh phía trên để xem PPCT.</p>
              </div>
            ) : loadingCurriculum ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Đang trích xuất dữ liệu từ file... Quá trình này có thể mất vài phút.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 text-center w-24">Tiết PPCT</th>
                      <th className="px-6 py-4">Tên bài học</th>
                      <th className="px-6 py-4 w-64">Ghi chú</th>
                      {canManagePPCT && <th className="px-6 py-4 text-center w-20">Xóa</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson, index) => (
                      <tr key={lesson.id || index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="1"
                            value={lesson.lessonNumber}
                            onChange={(e) => handleUpdateLesson(index, 'lessonNumber', e.target.value)}
                            disabled={!canManagePPCT}
                            className="w-full text-center border-transparent bg-transparent rounded-none px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none font-semibold text-indigo-700 transition-colors disabled:opacity-100 disabled:cursor-default"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={lesson.lessonName}
                            onChange={(e) => handleUpdateLesson(index, 'lessonName', e.target.value)}
                            disabled={!canManagePPCT}
                            className="w-full border-transparent bg-transparent rounded-none px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none text-gray-900 transition-colors disabled:opacity-100 disabled:cursor-default"
                            placeholder="Nhập tên bài học..."
                          />
                        </td>
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={lesson.note}
                            onChange={(e) => handleUpdateLesson(index, 'note', e.target.value)}
                            disabled={!canManagePPCT}
                            className="w-full border-transparent bg-transparent rounded-none px-4 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:bg-white outline-none text-gray-600 transition-colors disabled:opacity-100 disabled:cursor-default"
                            placeholder="Ghi chú (VD: 02 tiết)..."
                          />
                        </td>
                        {canManagePPCT && (
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleRemoveLesson(index)}
                              className="text-red-500 hover:text-red-700 transition-colors p-2.5 rounded-xl hover:bg-red-50"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    
                    {lessons.length === 0 && (
                      <tr>
                        <td colSpan={canManagePPCT ? 4 : 3} className="px-6 py-12 text-center text-gray-500">
                          Chưa có tiết PPCT nào. Hãy thêm thủ công hoặc Import từ file Markdown.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {canManagePPCT && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={handleAddLesson}
                      className="flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors rounded-xl hover:bg-indigo-100 border border-transparent hover:border-indigo-200"
                      style={{ padding: '10px 20px' }}
                    >
                      <Plus size={20} /> Thêm tiết mới
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: AI PROMPT ===================== */}
      {showPromptModal && selectedSubjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ padding: '24px' }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                <Sparkles className="text-purple-600 w-6 h-6" /> 
                Prompt tạo PPCT bằng AI
              </h3>
              <button onClick={() => setShowPromptModal(false)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4 font-medium">
              Bạn có thể sao chép câu lệnh dưới đây và gửi cho ChatGPT, Claude hoặc Gemini để AI tự động tạo file Excel Phân phối chương trình chính xác nhất cho bạn.
            </p>

            <div className="relative">
              <textarea 
                readOnly
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[160px] resize-none"
                value={`Đóng vai là một chuyên gia giáo dục THCS. Tôi có đính kèm theo đây file Phụ lục 1 (hoặc Khung PPCT). Dựa vào dữ liệu trong file đính kèm, vui lòng lập Phân phối chương trình (PPCT) chi tiết cho môn học **${subjects.find(s => s.id === selectedSubjectId)?.name || 'đang chọn'}** dành cho khối **${subjects.find(s => s.id === selectedSubjectId)?.grade || 'đang chọn'}** theo chuẩn Chương trình GDPT 2018 mới nhất.

Yêu cầu chi tiết:
1. Kết quả bắt buộc phải là một bảng dữ liệu có đúng 4 cột: "STT", "Tiết PPCT", "Tên bài học", "Ghi chú".
2. Vui lòng xuất bảng dữ liệu này thành một file **Excel (.xlsx)** để tôi có thể tải xuống và nhập trực tiếp vào phần mềm.

Xin cảm ơn!`}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                onClick={() => setShowPromptModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const subject = subjects.find(s => s.id === selectedSubjectId);
                  const text = `Đóng vai là một chuyên gia giáo dục THCS. Tôi có đính kèm theo đây file Phụ lục 1 (hoặc Khung PPCT). Dựa vào dữ liệu trong file đính kèm, vui lòng lập Phân phối chương trình (PPCT) chi tiết cho môn học **${subject?.name || 'đang chọn'}** dành cho khối **${subject?.grade || 'đang chọn'}** theo chuẩn Chương trình GDPT 2018 mới nhất.\n\nYêu cầu chi tiết:\n1. Kết quả bắt buộc phải là một bảng dữ liệu có đúng 4 cột: "STT", "Tiết PPCT", "Tên bài học", "Ghi chú".\n2. Vui lòng xuất bảng dữ liệu này thành một file **Excel (.xlsx)** để tôi có thể tải xuống và nhập trực tiếp vào phần mềm.\n\nXin cảm ơn!`;
                  navigator.clipboard.writeText(text);
                  alert('Đã sao chép câu lệnh vào bộ nhớ tạm!');
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-colors text-sm shadow-md flex items-center gap-2"
              >
                <Copy size={16} /> Sao chép Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
