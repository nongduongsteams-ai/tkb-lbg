import { getClasses } from "@/actions/class";
import { getTeachers } from "@/actions/teacher";
import ClassClient from "./ClassClient";

import { getSupportedGrades } from "@/actions/config";

export default async function ClassesPage() {
  const currentSchoolYear = "2026-2027"; // TODO: Có thể lấy từ bảng cấu hình hoặc store
  
  const [classesResult, teachersResult, supportedGrades] = await Promise.all([
    getClasses(currentSchoolYear),
    getTeachers(),
    getSupportedGrades()
  ]);

  const classes = classesResult.success ? classesResult.data : [];
  const teachers = teachersResult.success ? teachersResult.data : [];

  return (
    <div className="flex-1 p-6 h-[calc(100vh-64px)] overflow-hidden bg-gray-50 flex flex-col">
      <div 
        className="bg-white border border-[#e5e7eb] rounded-3xl shadow-sm flex flex-col h-full overflow-hidden"
        style={{ padding: '0px' }} // Container layout chính, nội dung bên trong sẽ chia padding
      >
        <ClassClient initialClasses={classes} teachers={teachers} currentSchoolYear={currentSchoolYear} supportedGrades={supportedGrades} />
      </div>
    </div>
  );
}
