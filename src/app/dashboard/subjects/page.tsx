import { getSubjects } from "@/actions/subject";
import SubjectClient from "./SubjectClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSupportedGrades } from "@/actions/config";

export default async function SubjectsPage() {
  const [result, supportedGrades] = await Promise.all([
    getSubjects(),
    getSupportedGrades()
  ]);
  const initialSubjects = result.success ? result.data : [];

  return <SubjectClient initialSubjects={initialSubjects} supportedGrades={supportedGrades} />;
}
