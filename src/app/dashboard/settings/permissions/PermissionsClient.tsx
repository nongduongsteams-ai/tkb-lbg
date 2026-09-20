"use client";

import { useState } from "react";
import { SYSTEM_ACTIONS, ALL_ROLES_AND_TITLES, SystemAction } from "@/lib/permissions";
import { saveRolePermissions } from "@/actions/config";
import { Save, AlertCircle } from "lucide-react";

interface PermissionsClientProps {
  initialMapping: Record<string, string[]>;
}

export default function PermissionsClient({ initialMapping }: PermissionsClientProps) {
  const [mapping, setMapping] = useState<Record<string, string[]>>(initialMapping);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (roleOrTitle: string, actionId: SystemAction) => {
    setMapping((prev) => {
      const currentActions = prev[roleOrTitle] || [];
      const hasAction = currentActions.includes(actionId);
      
      const newActions = hasAction
        ? currentActions.filter(a => a !== actionId)
        : [...currentActions, actionId];
        
      return {
        ...prev,
        [roleOrTitle]: newActions
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const res = await saveRolePermissions(mapping);
      if (res.success) {
        alert("Đã lưu cấu hình phân quyền thành công! Người dùng có thể cần tải lại trang để áp dụng.");
      } else {
        alert("Lỗi khi lưu: " + res.error);
      }
    } catch (error: any) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Quản lý Phân Quyền (RBAC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập chi tiết quyền hạn cho từng chức vụ/vai trò trong hệ thống.
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex gap-3 border border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Hướng dẫn sử dụng:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Tích vào ô để cấp quyền cho một chức vụ cụ thể.</li>
            <li>Quyền thực tế của một người dùng sẽ là <strong>tổng hợp</strong> quyền từ Vai trò (ADMIN/BGH/GV) và các Chức vụ mà họ đang giữ (Tổ trưởng, GVBM...).</li>
            <li>Sau khi thay đổi, người dùng hiện tại có thể cần F5 (tải lại trang) để thấy sự thay đổi.</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr>
              <th className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-r border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 sticky left-0 z-10 w-48">
                Vai trò / Chức vụ
              </th>
              {SYSTEM_ACTIONS.map(action => (
                <th key={action.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 text-center text-xs tracking-wider">
                  <div className="max-w-[100px] mx-auto whitespace-normal leading-tight">
                    {action.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_ROLES_AND_TITLES.map((role, idx) => (
              <tr key={role} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"}>
                <td className="p-4 border-b border-r border-gray-200 dark:border-gray-700 font-medium text-gray-800 dark:text-gray-200 sticky left-0 z-10 bg-inherit">
                  {role}
                  {["ADMIN", "BGH", "GV"].includes(role) && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase">Role</span>
                  )}
                </td>
                
                {SYSTEM_ACTIONS.map(action => {
                  const isChecked = mapping[role]?.includes(action.id) || false;
                  // ADMIN luôn full quyền
                  const isDisabled = role === "ADMIN";
                  
                  return (
                    <td key={action.id} className="p-4 border-b border-gray-200 dark:border-gray-700 text-center">
                      <label className="flex justify-center items-center cursor-pointer h-full w-full">
                        <input
                          type="checkbox"
                          checked={isDisabled ? true : isChecked}
                          disabled={isDisabled}
                          onChange={() => handleToggle(role, action.id)}
                          className={`w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
