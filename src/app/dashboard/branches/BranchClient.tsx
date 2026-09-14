'use client';

import { useState, useTransition } from 'react';
import { updateClassBranch, updateUserBranch } from '@/actions/branch';

export default function BranchClient({ initialClasses, initialTeachers }: { initialClasses: any[]; initialTeachers: any[] }) {
  const [activeTab, setActiveTab] = useState<'classes' | 'teachers'>('classes');
  const [isPending, startTransition] = useTransition();

  const handleClassChange = (id: string, branch: string) => {
    startTransition(() => {
      updateClassBranch(id, branch);
    });
  };

  const handleTeacherChange = (id: string, branch: string) => {
    startTransition(() => {
      updateUserBranch(id, branch);
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-200" style={{ padding: '24px' }}>
      <style>{`
        /* Force dark mode styles if Tailwind cache failed */
        .dark .dark\\:bg-gray-800 { background-color: #1f2937 !important; }
        .dark .dark\\:bg-gray-700 { background-color: #374151 !important; }
        .dark .dark\\:bg-gray-900\\/50 { background-color: rgba(17, 24, 39, 0.5) !important; }
        .dark .dark\\:border-gray-700 { border-color: #374151 !important; }
        .dark .dark\\:border-gray-600 { border-color: #4b5563 !important; }
        .dark .dark\\:text-white { color: #ffffff !important; }
      `}</style>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6" style={{ gap: '16px' }}>
        <button
          className={`font-medium text-sm transition-colors relative ${activeTab === 'classes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          style={{ padding: '16px 24px' }}
          onClick={() => setActiveTab('classes')}
        >
          Danh sách Lớp học
          {activeTab === 'classes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
        <button
          className={`font-medium text-sm transition-colors relative ${activeTab === 'teachers' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
          style={{ padding: '16px 24px' }}
          onClick={() => setActiveTab('teachers')}
        >
          Danh sách Giáo viên
          {activeTab === 'teachers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
        </button>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        {activeTab === 'classes' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên lớp</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Khối</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cơ sở / Điểm trường</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {initialClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{cls.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{cls.grade}</td>
                  <td className="py-3 px-4">
                    <select
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      style={{ padding: '10px' }}
                      defaultValue={cls.branch}
                      disabled={isPending}
                      onChange={(e) => handleClassChange(cls.id, e.target.value)}
                    >
                      <option value="Trường chính">Trường chính</option>
                      <option value="Phân hiệu">Phân hiệu (Điểm trường lẻ)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'teachers' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên giáo viên</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vai trò</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cơ sở / Điểm trường</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {initialTeachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{teacher.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{teacher.role}</td>
                  <td className="py-3 px-4">
                    <select
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                      style={{ padding: '10px' }}
                      defaultValue={teacher.branch}
                      disabled={isPending}
                      onChange={(e) => handleTeacherChange(teacher.id, e.target.value)}
                    >
                      <option value="Trường chính">Trường chính</option>
                      <option value="Phân hiệu">Phân hiệu (Điểm trường lẻ)</option>
                      <option value="Cả hai">Dạy cả hai cơ sở</option>
                    </select>
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
