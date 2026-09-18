"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, X, Check, ArrowUpDown, ArrowUp, ArrowDown, KeyRound, RefreshCw, Copy, Eye, EyeOff, UserCheck, Mail, Lock } from "lucide-react";
import { createTeacher, updateTeacher, deleteTeacher, resetTeacherPassword, bulkSetupTeacherAccounts } from "@/actions/teacher";

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

  // Account info popup after create/reset
  const [accountInfo, setAccountInfo] = useState<{ email: string; password: string; name: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    permissions: [] as string[],
    email: "",
    password: "",
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", shortName: "", permissions: [], email: "", password: "" });
    setEditingId(null);
    setIsModalOpen(false);
    setShowFormPassword(false);
  };

  const handleEdit = (teacher: any) => {
    setFormData({
      name: teacher.name || "",
      shortName: teacher.shortName || "",
      permissions: teacher.permissions || [],
      email: teacher.email || "",
      password: "", // Không hiện password cũ
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

  const handleResetPassword = async (teacher: any) => {
    if (!confirm(`Reset mật khẩu cho GV "${teacher.name}"?\nMật khẩu mới sẽ được tạo tự động.`)) return;
    setLoading(true);
    const result = await resetTeacherPassword(teacher.id);
    if (result.success && result.newPassword) {
      setAccountInfo({ email: teacher.email, password: result.newPassword, name: teacher.name });
    } else {
      alert("Reset thất bại: " + result.error);
    }
    setLoading(false);
  };

  const handleBulkSetup = async () => {
    if (!confirm("Tự động tạo tài khoản (email + mật khẩu) cho các giáo viên chưa có?\nDanh sách tài khoản sẽ hiển thị sau khi hoàn tất.")) return;
    setLoading(true);
    const result = await bulkSetupTeacherAccounts();
    if (result.success && result.data) {
      if (result.data.length === 0) {
        alert("Tất cả giáo viên đã có tài khoản hợp lệ.");
      } else {
        // Tạo nội dung CSV
        let csvContent = "Họ và tên,Email,Mật khẩu\n";
        result.data.forEach((t: any) => {
          csvContent += `"${t.name}","${t.email}","${t.password}"\n`;
        });
        
        // Tạo Blob và tự động tải xuống
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" }); // UTF-8 BOM
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `TaiKhoan_GiaoVien_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`✅ Đã tạo và cập nhật ${result.data.length} tài khoản. Hệ thống đã tự động tải xuống danh sách (file CSV).`);
        // Reload teachers list
        setTeachers(prev => prev.map(t => {
          const updated = result.data?.find((u: any) => u.id === t.id);
          return updated ? { ...t, email: updated.email } : t;
        }));
      }
    } else {
      alert("Lỗi: " + result.error);
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
        // Hiện thông tin tài khoản vừa tạo
        if (result.accountInfo) {
          setAccountInfo({
            email: result.accountInfo.email,
            password: result.accountInfo.password,
            name: formData.name,
          });
        }
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
    return 10;
  };

  const defaultSortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => {
      const rankA = getRank(a.permissions);
      const rankB = getRank(b.permissions);
      let comp = rankA - rankB;
      if (comp === 0) {
        const nameA = (a.name || "").split(' ').pop() || a.name;
        const nameB = (b.name || "").split(' ').pop() || b.name;
        comp = nameA.localeCompare(nameB, 'vi');
        if (comp === 0) comp = (a.name || "").localeCompare(b.name || "", 'vi');
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
        const nameA = (a[key] || "").split(' ').pop() || a[key];
        const nameB = (b[key] || "").split(' ').pop() || b[key];
        comparison = nameA.localeCompare(nameB, 'vi');
        if (comparison === 0) comparison = (a[key] || "").localeCompare(b[key] || "", 'vi');
      } else if (key === 'permissions') {
        comparison = getRank(a.permissions) - getRank(b.permissions);
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [teachers, sortConfig, defaultSortedTeachers]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 inline text-gray-400" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="ml-1 inline text-indigo-600" />;
    return <ArrowDown size={14} className="ml-1 inline text-indigo-600" />;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "#111827" }}>

      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/80 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Quản lý Giáo viên & Tài khoản</h3>
          <p className="text-sm text-gray-500 mt-1">Thêm giáo viên, cấp tài khoản đăng nhập, phân quyền chức vụ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleBulkSetup}
            disabled={loading}
            className="flex items-center gap-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 font-semibold shadow-sm transition-all disabled:opacity-50"
            style={{ padding: '10px 18px', fontSize: '0.875rem' }}
          >
            <UserCheck size={18} /> Cấp TK hàng loạt
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
            style={{ padding: '10px 24px' }}
          >
            <Plus size={20} /> Thêm Giáo viên
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-4 border-b text-center w-16 cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('index')}>
                STT <SortIcon columnKey="index" />
              </th>
              <th className="px-4 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('name')}>
                Họ và tên <SortIcon columnKey="name" />
              </th>
              <th className="px-4 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('shortName')}>
                Tên TKB <SortIcon columnKey="shortName" />
              </th>
              <th className="px-4 py-4 border-b font-semibold">
                <div className="flex items-center gap-1"><Mail size={13} /> Email đăng nhập</div>
              </th>
              <th className="px-4 py-4 border-b cursor-pointer hover:bg-gray-200 font-semibold" onClick={() => requestSort('permissions')}>
                Chức vụ <SortIcon columnKey="permissions" />
              </th>
              <th className="px-4 py-4 border-b text-center w-44 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeachers.map((teacher) => {
              const teacherSTT = defaultSortedTeachers.findIndex(t => t.id === teacher.id) + 1;
              const hasDummyAccount = teacher.email?.startsWith("gv_") && (teacher.email?.endsWith("@school.edu.vn") || teacher.email?.endsWith("@tkb.local"));
              return (
                <tr key={teacher.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 text-center font-bold text-gray-500">{teacherSTT}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{teacher.name}</td>
                  <td className="px-4 py-4 text-indigo-700 font-semibold">{teacher.shortName || "–"}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${hasDummyAccount ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                        {teacher.email || "Chưa có"}
                      </span>
                      {hasDummyAccount && (
                        <span className="text-[10px] text-red-500 font-semibold">⚠ Cần cập nhật</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {teacher.permissions?.length > 0 ? (
                        teacher.permissions.map((p: string) => (
                          <span key={p} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-sm">Giáo viên</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEdit(teacher)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Sửa thông tin">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleResetPassword(teacher)} className="text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors" title="Reset mật khẩu">
                        <KeyRound size={16} />
                      </button>
                      <button onClick={() => handleDelete(teacher.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors" title="Xóa">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Chưa có dữ liệu giáo viên. Hãy thêm mới.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-100"
            style={{ width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", color: "#111827" }}
          >
            <div className="border-b border-gray-200 bg-gray-50 flex justify-between items-center" style={{ padding: "20px 28px" }}>
              <h3 className="font-extrabold text-gray-900" style={{ fontSize: "1.25rem" }}>
                {editingId ? "Cập nhật Giáo viên" : "Thêm mới Giáo viên"}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={22} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Họ tên */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Họ và tên đầy đủ *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vd: Nguyễn Văn An"
                  style={{ color: "#111827", backgroundColor: "#fff", padding: "11px 14px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.9rem", width: "100%", outline: "none" }}
                />
              </div>

              {/* Tên TKB */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Tên hiển thị TKB (Tên ngắn)</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                  placeholder="Vd: An"
                  style={{ color: "#111827", backgroundColor: "#fff", padding: "11px 14px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.9rem", width: "100%", outline: "none" }}
                />
              </div>

              {/* Divider tài khoản */}
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <Lock size={15} style={{ color: "#6366f1" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151" }}>
                    Thông tin tài khoản đăng nhập
                  </span>
                </div>

                {/* Email */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
                    Email đăng nhập {editingId ? "(để trống = không đổi)" : "(để trống = tự tạo)"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder={editingId ? "Để trống = không thay đổi" : "Để trống = tạo tự động từ tên"}
                      style={{ color: "#111827", backgroundColor: "#f9fafb", padding: "11px 14px 11px 36px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.9rem", width: "100%", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>
                    Mật khẩu {editingId ? "(để trống = không đổi)" : "(để trống = tạo tự động)"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingId ? "Để trống = giữ nguyên" : "Để trống = tự tạo mật khẩu"}
                      style={{ color: "#111827", backgroundColor: "#f9fafb", padding: "11px 44px 11px 14px", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "0.9rem", width: "100%", outline: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
                    >
                      {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {!editingId && (
                    <p style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      💡 Hệ thống sẽ tạo email dạng <code>tênGV@c2nt.edu.vn</code> và mật khẩu ngẫu nhiên nếu để trống.
                    </p>
                  )}
                </div>
              </div>

              {/* Phân quyền */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}>Phân quyền / Chức vụ</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {PERMISSION_OPTIONS.map(perm => (
                    <label key={perm} className="hover:bg-gray-50" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontSize: "0.875rem", color: "#1f2937" }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="text-indigo-600"
                        style={{ width: "16px", height: "16px", borderRadius: "4px" }}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "16px" }}>
                <button type="button" onClick={resetForm} className="bg-white hover:bg-gray-50"
                  style={{ padding: "9px 18px", fontSize: "0.875rem", fontWeight: 500, color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" }}>
                  Hủy
                </button>
                <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 20px", fontSize: "0.875rem", fontWeight: 500, color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                  <Check size={16} /> {editingId ? "Lưu thay đổi" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal hiện thông tin tài khoản vừa tạo / reset */}
      {accountInfo && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100"
            style={{ width: "100%", maxWidth: "420px", padding: "32px", color: "#111827" }}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ width: "56px", height: "56px", background: "#ecfdf5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Check size={28} style={{ color: "#10b981" }} />
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827" }}>Tài khoản đã sẵn sàng!</h3>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "6px" }}>
                Tài khoản đăng nhập cho <strong>{accountInfo.name}</strong>
              </p>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px" }}>
              <InfoRow icon={<Mail size={14} />} label="Email" value={accountInfo.email} onCopy={() => copyToClipboard(accountInfo.email)} />
              <div style={{ height: "1px", background: "#e2e8f0", margin: "10px 0" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <KeyRound size={14} style={{ color: "#6366f1" }} />
                  <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Mật khẩu</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <code style={{ fontSize: "1rem", fontWeight: 700, color: "#4f46e5", letterSpacing: "2px" }}>
                    {showPassword ? accountInfo.password : "••••••••"}
                  </code>
                  <button onClick={() => setShowPassword(!showPassword)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button onClick={() => copyToClipboard(accountInfo.password)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "0.78rem", color: "#f59e0b", marginBottom: "16px", textAlign: "center" }}>
              ⚠️ Ghi lại thông tin này ngay. Mật khẩu sẽ không hiển thị lại sau khi đóng.
            </p>

            <button
              onClick={() => { setAccountInfo(null); setShowPassword(false); }}
              style={{ width: "100%", padding: "11px", background: "#4f46e5", color: "white", fontWeight: 700, border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "0.95rem" }}
            >
              Đã ghi nhận, Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value, onCopy }: { icon: React.ReactNode; label: string; value: string; onCopy?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#6366f1" }}>{icon}</span>
        <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <code style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{value}</code>
        {onCopy && (
          <button onClick={onCopy} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
