"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { createClass, updateClass, deleteClass } from "@/actions/class";

type ClassType = {
  id: string;
  name: string;
  grade: number;
  schoolYear: string;
  homeroomTeacherId: string | null;
  homeroomTeacher?: {
    id: string;
    name: string;
    shortName: string | null;
  } | null;
};

type TeacherType = {
  id: string;
  name: string;
  shortName: string | null;
};

export default function ClassClient({ 
  initialClasses,
  teachers,
  currentSchoolYear,
  supportedGrades
}: { 
  initialClasses: any[];
  teachers: any[];
  currentSchoolYear: string;
  supportedGrades: number[];
}) {
  const [classes, setClasses] = useState<ClassType[]>(initialClasses);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    grade: supportedGrades[0] || 6,
    homeroomTeacherId: "",
  });

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);

  const resetForm = () => {
    setFormData({ name: "", grade: supportedGrades[0] || 6, homeroomTeacherId: "" });
    setEditingId(null);
    setIsModalOpen(false);
    setErrorMsg("");
  };

  const handleEdit = (cls: ClassType) => {
    setFormData({
      name: cls.name,
      grade: cls.grade,
      homeroomTeacherId: cls.homeroomTeacherId || "",
    });
    setEditingId(cls.id);
    setIsModalOpen(true);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Vui lòng nhập tên lớp.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const payload = {
      name: formData.name.trim(),
      grade: formData.grade,
      schoolYear: currentSchoolYear,
      homeroomTeacherId: formData.homeroomTeacherId || undefined,
    };

    let result;
    if (editingId) {
      result = await updateClass(editingId, payload);
    } else {
      result = await createClass(payload);
    }

    if (result.success) {
      if (editingId) {
        setClasses(classes.map(c => c.id === editingId ? result.data : c));
      } else {
        setClasses([...classes, result.data]);
      }
      resetForm();
    } else {
      setErrorMsg(result.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lớp học này? Mọi dữ liệu liên quan sẽ bị ảnh hưởng.")) return;
    
    const result = await deleteClass(id);
    if (result.success) {
      setClasses(classes.filter(c => c.id !== id));
    } else {
      alert("Xóa thất bại: " + result.error);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedClasses = [...classes].sort((a: any, b: any) => {
    if (!sortConfig) {
      // Default sort by grade then name
      if (a.grade === b.grade) return a.name.localeCompare(b.name);
      return a.grade - b.grade;
    }
    
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 inline text-gray-400" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 inline text-indigo-600" />;
    return <ArrowDown size={14} className="ml-1 inline text-indigo-600" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "#111827" }}>
      {/* Header */}
      <div 
        className="border-b border-gray-200 bg-gray-50/80 flex justify-between items-center"
        style={{ padding: '24px 32px' }}
      >
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Quản lý Lớp học</h3>
          <p className="text-sm text-gray-500 mt-1">Danh sách các lớp học và Giáo viên chủ nhiệm năm học {currentSchoolYear}</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
          style={{ padding: '10px 24px' }}
        >
          <Plus size={20} /> Thêm Lớp học
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border-b text-center w-20 font-semibold" style={{ padding: '16px 24px' }}>
                STT
              </th>
              <th className="border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('name')} style={{ padding: '16px 24px' }}>
                Tên lớp <SortIcon columnKey="name" />
              </th>
              <th className="border-b text-center cursor-pointer hover:bg-gray-200 font-semibold w-32" onClick={() => requestSort('grade')} style={{ padding: '16px 24px' }}>
                Khối <SortIcon columnKey="grade" />
              </th>
              <th className="border-b font-semibold" style={{ padding: '16px 24px' }}>
                Giáo viên Chủ nhiệm (GVCN)
              </th>
              <th className="border-b text-center w-32 font-semibold" style={{ padding: '16px 24px' }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedClasses.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500" style={{ padding: '48px 24px' }}>
                  Chưa có dữ liệu lớp học cho năm học này.
                </td>
              </tr>
            ) : (
              sortedClasses.map((cls, index) => (
                <tr key={cls.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                  <td className="text-center font-medium text-gray-500" style={{ padding: '16px 24px' }}>
                    {index + 1}
                  </td>
                  <td className="font-bold text-gray-900" style={{ padding: '16px 24px' }}>
                    {cls.name}
                  </td>
                  <td className="text-center font-semibold text-indigo-600" style={{ padding: '16px 24px' }}>
                    {cls.grade}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {cls.homeroomTeacher ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          {cls.homeroomTeacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{cls.homeroomTeacher.name}</p>
                          {cls.homeroomTeacher.shortName && (
                            <p className="text-xs text-gray-500">Tên TKB: {cls.homeroomTeacher.shortName}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Chưa phân công</span>
                    )}
                  </td>
                  <td className="text-center" style={{ padding: '16px 24px' }}>
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(cls)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" style={{ padding: '8px' }} title="Sửa">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(cls.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" style={{ padding: '8px' }} title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="border-b border-gray-100 bg-gray-50/50 flex justify-between items-center" style={{ padding: '20px 28px' }}>
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Cập nhật Lớp học" : "Thêm Lớp học mới"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors" style={{ padding: '8px' }}>
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
              {errorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 rounded-lg text-sm" style={{ padding: '12px 16px' }}>
                  {errorMsg}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tên Lớp <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 6A, 6B..."
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm"
                    style={{ padding: '10px 16px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Khối</label>
                  <select
                    value={formData.grade}
                    onChange={e => setFormData({...formData, grade: parseInt(e.target.value)})}
                    className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm bg-white"
                    style={{ padding: '10px 16px' }}
                  >
                    {supportedGrades.map(g => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giáo viên Chủ nhiệm (Tùy chọn)</label>
                  <select
                    value={formData.homeroomTeacherId}
                    onChange={e => setFormData({...formData, homeroomTeacherId: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm bg-white"
                    style={{ padding: '10px 16px' }}
                  >
                    <option value="">-- Chưa phân công --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.shortName ? `(${t.shortName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 flex justify-end gap-3" style={{ marginTop: '24px', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
                  style={{ padding: '10px 20px' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                  style={{ padding: '10px 20px' }}
                >
                  <Check size={18} /> {editingId ? "Lưu thay đổi" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
