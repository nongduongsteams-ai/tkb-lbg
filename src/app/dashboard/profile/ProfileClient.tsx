"use client";

import { useState } from "react";
import { changePassword } from "@/actions/profile";
import { Shield, KeyRound, User, Mail, Building2, CheckCircle2, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    shortName?: string | null;
    permissions: string[];
    branch: string;
    createdAt: Date;
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN: { label: "Quản trị viên", color: "text-rose-700", bg: "bg-rose-100" },
  BGH: { label: "Ban Giám Hiệu", color: "text-violet-700", bg: "bg-violet-100" },
  GV: { label: "Giáo viên", color: "text-sky-700", bg: "bg-sky-100" },
};

export default function ProfileClient({ user }: ProfileClientProps) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, color: "text-gray-700", bg: "bg-gray-100" };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!currentPass || !newPass || !confirmPass) {
      setMessage({ type: "error", text: "Vui lòng điền đầy đủ thông tin" });
      return;
    }
    if (newPass !== confirmPass) {
      setMessage({ type: "error", text: "Mật khẩu mới và xác nhận không khớp" });
      return;
    }
    if (newPass.length < 4) {
      setMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 4 ký tự" });
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPass, newPass);
    setLoading(false);

    if (result.success) {
      setMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      setMessage({ type: "error", text: result.error || "Đổi mật khẩu thất bại" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-slate-500 mt-1">Xem thông tin tài khoản và đổi mật khẩu đăng nhập.</p>
      </div>

      {/* Card thông tin */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="px-8 pb-8">
          {/* Avatar */}
          <div className="flex items-end gap-5 -mt-10 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-indigo-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              {user.shortName && (
                <p className="text-sm text-gray-500">Tên TKB: <span className="font-medium">{user.shortName}</span></p>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={<User className="w-4 h-4" />} label="Họ và tên" value={user.name} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email đăng nhập" value={user.email} mono />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="Vai trò"
              value={
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.bg} ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              }
            />
            <InfoRow icon={<Building2 className="w-4 h-4" />} label="Đơn vị" value={user.branch} />
            {user.permissions.length > 0 && (
              <div className="sm:col-span-2">
                <InfoRow
                  icon={<Shield className="w-4 h-4" />}
                  label="Chức vụ"
                  value={
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.permissions.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                          {p}
                        </span>
                      ))}
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card đổi mật khẩu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Đổi mật khẩu</h3>
            <p className="text-sm text-gray-500">Cập nhật mật khẩu đăng nhập của bạn</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordField
            label="Mật khẩu hiện tại"
            value={currentPass}
            onChange={setCurrentPass}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(!showCurrent)}
            placeholder="Nhập mật khẩu hiện tại"
          />
          <PasswordField
            label="Mật khẩu mới"
            value={newPass}
            onChange={setNewPass}
            show={showNew}
            onToggleShow={() => setShowNew(!showNew)}
            placeholder="Tối thiểu 4 ký tự"
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            value={confirmPass}
            onChange={setConfirmPass}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(!showConfirm)}
            placeholder="Nhập lại mật khẩu mới"
          />

          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message.type === "success"
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 24px" }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {loading ? "Đang lưu..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-medium text-gray-800 ${mono ? "font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ padding: "10px 44px 10px 14px" }}
          className="w-full border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-gray-50"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
