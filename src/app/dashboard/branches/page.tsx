import { getBranchData } from '@/actions/branch';
import BranchClient from './BranchClient';

export default async function BranchesPage() {
  const { classes, teachers } = await getBranchData('2026-2027');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Phân hiệu</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Phân chia Lớp học và Giáo viên theo Trường chính / Phân hiệu để lên TKB.
          </p>
        </div>
      </div>
      <BranchClient initialClasses={classes} initialTeachers={teachers} />
    </div>
  );
}
