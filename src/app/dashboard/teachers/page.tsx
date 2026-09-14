import { getTeachers } from "@/actions/teacher";
import TeacherClient from "./TeacherClient";

export default async function TeachersPage() {
  const result = await getTeachers();
  const teachers = result.success ? result.data : [];

  return (
    <div className="flex-1 p-6 h-screen overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
        <TeacherClient initialTeachers={teachers} />
      </div>
    </div>
  );
}
