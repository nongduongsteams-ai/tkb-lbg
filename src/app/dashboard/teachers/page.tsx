import { getTeachers } from "@/actions/teacher";
import TeacherClient from "./TeacherClient";

export default async function TeachersPage() {
  const result = await getTeachers();
  const initialTeachers: any[] = result.success && result.data ? result.data : [];

  return (
    <div className="flex-1 p-6 h-screen overflow-hidden bg-gray-50 flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
        <TeacherClient initialTeachers={initialTeachers} />
      </div>
    </div>
  );
}
