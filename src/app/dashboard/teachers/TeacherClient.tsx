"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, X, Check, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { createTeacher, updateTeacher, deleteTeacher } from "@/actions/teacher";

const PERMISSION_OPTIONS = [
  "BGH HT",
  "BGH PHT",
  "GVBM",
  "Tổ trưởng KHTN",
  "Tổ phó KHTN",
  "Tổ trưởng KHXH",
  "Tổ phó KHXH",
  "TPT Đội",
  "Phó TPT Đội"
];

export default function TeacherClient({ initialTeachers }: { initialTeachers: any[] }) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'index', direction: 'asc' });
  
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    permissions: [] as string[]
  });
  
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", shortName: "", permissions: [] });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (teacher: any) => {
    setFormData({
      name: teacher.name || "",
      shortName: teacher.shortName || "",
      permissions: teacher.permissions || []
    });
    setEditingId(teacher.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giáo viên này?")) return;
    
    setLoading(true);
    const result = await deleteTeacher(id);
    if (result.success) {
      setTeachers(teachers.filter(t => t.id !== id));
    } else {
      alert("Xóa thất bại: " + result.error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingId) {
      const result = await updateTeacher(editingId, formData);
      if (result.success) {
        setTeachers(teachers.map(t => t.id === editingId ? { ...t, ...formData } : t));
        resetForm();
      } else {
        alert("Cập nhật thất bại: " + result.error);
      }
    } else {
      const result = await createTeacher(formData);
      if (result.success) {
        setTeachers([result.data, ...teachers]);
        resetForm();
      } else {
        alert("Thêm mới thất bại: " + result.error);
      }
    }
    setLoading(false);
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const getRank = (permissions: string[]) => {
    if (!permissions || permissions.length === 0) return 10;
    if (permissions.includes("BGH HT") || permissions.includes("HT")) return 1;
    if (permissions.includes("BGH PHT") || permissions.includes("PHT")) return 2;
    if (permissions.includes("BGH")) return 3;
    
    if (permissions.some(p => p.includes("Tổ trưởng"))) return 4;
    if (permissions.some(p => p.includes("Tổ phó"))) return 5;
    if (permissions.includes("TPT Đội")) return 6;
    if (permissions.includes("Phó TPT Đội")) return 7;
    if (permissions.includes("GVBM")) return 8;
    if (permissions.includes("Nhân viên")) return 9;
    return 10; // Others
  };

  const defaultSortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => {
      const rankA = getRank(a.permissions);
      const rankB = getRank(b.permissions);
      let comp = rankA - rankB;
      if (comp === 0) {
        const valA = a.name || "";
        const valB = b.name || "";
        const nameA = valA.split(' ').pop() || valA;
        const nameB = valB.split(' ').pop() || valB;
        comp = nameA.localeCompare(nameB, 'vi');
        if (comp === 0) comp = valA.localeCompare(valB, 'vi');
      }
      return comp;
    });
  }, [teachers]);

  const sortedTeachers = useMemo(() => {
    if (!sortConfig || sortConfig.key === 'index') {
       return sortConfig?.direction === 'desc' 
          ? [...defaultSortedTeachers].reverse() 
          : defaultSortedTeachers;
    }
    
    return [...teachers].sort((a, b) => {
      const { key, direction } = sortConfig;
      let comparison = 0;

      if (key === 'name' || key === 'shortName') {
        const valA = a[key] || "";
        const valB = b[key] || "";
        const nameA = valA.split(' ').pop() || valA;
        const nameB = valB.split(' ').pop() || valB;
        comparison = nameA.localeCompare(nameB, 'vi');
        if (comparison === 0) comparison = valA.localeCompare(valB, 'vi');
      } else if (key === 'permissions') {
        const rankA = getRank(a.permissions);
        const rankB = getRank(b.permissions);
        comparison = rankA - rankB;
        if (comparison === 0) {
          const valA = a.name || "";
          const valB = b.name || "";
          const nameA = valA.split(' ').pop() || valA;
          const nameB = valB.split(' ').pop() || valB;
          comparison = nameA.localeCompare(nameB, 'vi');
          if (comparison === 0) comparison = valA.localeCompare(valB, 'vi');
        }
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [teachers, sortConfig, defaultSortedTeachers]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 inline text-gray-400" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 inline text-indigo-600" />;
    return <ArrowDown size={14} className="ml-1 inline text-indigo-600" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "#111827" }}>
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Quản lý Giáo viên</h3>
          <p className="text-sm text-gray-500 mt-1">Thêm, sửa, xóa danh sách giáo viên và phân quyền chức vụ</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
          style={{ padding: '10px 24px' }}
        >
          <Plus size={20} /> Thêm Giáo viên
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 border-b text-center w-24 cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('index')}>
                STT <SortIcon columnKey="index" />
              </th>
              <th className="px-6 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('name')}>
                Họ và tên <SortIcon columnKey="name" />
              </th>
              <th className="px-6 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('shortName')}>
                Tên hiển thị TKB <SortIcon columnKey="shortName" />
              </th>
              <th className="px-6 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('permissions')}>
                Phân quyền / Chức vụ <SortIcon columnKey="permissions" />
              </th>
              <th className="px-6 py-4 border-b text-center w-36 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeachers.map((teacher) => {
              const teacherSTT = defaultSortedTeachers.findIndex(t => t.id === teacher.id) + 1;
              return (
              <tr key={teacher.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-center font-bold text-gray-500">{teacherSTT}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{teacher.name}</td>
                <td className="px-6 py-4 text-indigo-700 font-semibold">{teacher.shortName || "-"}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {teacher.permissions?.length > 0 ? (
                      teacher.permissions.map((p: string) => (
                        <span key={p} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 italic text-sm">Không có</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => handleEdit(teacher)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Sửa">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(teacher.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            
            {teachers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Chưa có dữ liệu giáo viên. Hãy thêm mới.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-100"
            style={{ width: "100%", maxWidth: "512px", color: "#111827" }}
          >
            <div className="border-b border-gray-200 bg-gray-50 flex justify-between items-center" style={{ padding: "20px 28px" }}>
              <h3 className="font-extrabold text-gray-900" style={{ fontSize: "1.25rem" }}>{editingId ? "Cập nhật Giáo viên" : "Thêm mới Giáo viên"}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={22} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151" }}>Họ và tên đầy đủ *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vd: Nông Văn Dưỡng"
                  style={{ color: "#111827", backgroundColor: "#fff", padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.95rem", width: "100%", outline: "none" }}
                  className="focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.95rem", fontWeight: 600, color: "#374151" }}>Tên hiển thị TKB (Tên ngắn)</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                  placeholder="Vd: Dưỡng"
                  style={{ color: "#111827", backgroundColor: "#fff", padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.95rem", width: "100%", outline: "none" }}
                  className="focus:ring-2 focus:ring-indigo-500"
                />
                <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>Tên này sẽ hiển thị gọn gàng trên lưới Thời khóa biểu.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>Phân quyền / Chức vụ</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {PERMISSION_OPTIONS.map(perm => (
                    <label key={perm} className="hover:bg-gray-50" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", color: "#1f2937" }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="text-indigo-600 focus:ring-indigo-500"
                        style={{ width: "16px", height: "16px", borderRadius: "4px" }}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px", paddingTop: "16px" }}>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white hover:bg-gray-50"
                  style={{ padding: "8px 16px", fontSize: "0.875rem", fontWeight: 500, color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "0.875rem", fontWeight: 500, color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >
                  <Check size={16} /> {editingId ? "Lưu thay đổi" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
