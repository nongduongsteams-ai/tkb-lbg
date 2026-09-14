"use client";

import { useState, useEffect, Fragment } from "react";
import { SchoolPlan } from "@prisma/client";
import { saveSubjectMatrix, deleteSubjectMatrix } from "@/actions/schoolPlan";
import { Plus, Edit2, Trash2, X, Save } from "lucide-react";

interface Props {
  initialData: SchoolPlan[];
  schoolYear: string;
  supportedGrades: number[];
}

type GradeData = {
  totalHk1: string;
  totalHk2: string;
  totalYear: string;
  periodsPerWeekHk1?: string;
  periodsPerWeekHk2?: string;
};

type MatrixPlan = {
  subjectName: string;
  grades: Record<number, GradeData>;
};

const emptyGradeData = (): GradeData => ({ totalHk1: "", totalHk2: "", totalYear: "" });

const createEmptyMatrix = (supportedGrades: number[]): MatrixPlan => {
  const matrix: MatrixPlan = { subjectName: "", grades: {} };
  supportedGrades.forEach(g => {
    matrix.grades[g] = emptyGradeData();
  });
  return matrix;
};

export default function SchoolPlanClient({ initialData, schoolYear, supportedGrades }: Props) {
  const [matrices, setMatrices] = useState<MatrixPlan[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [isEditing, setIsEditing] = useState<string | null>(null); // old subjectName
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<MatrixPlan>(createEmptyMatrix(supportedGrades));

  useEffect(() => {
    const map = new Map<string, MatrixPlan>();
    initialData.forEach((plan) => {
      if (!map.has(plan.subjectName)) {
        map.set(plan.subjectName, createEmptyMatrix(supportedGrades));
      }
      const entry = map.get(plan.subjectName)!;
      entry.subjectName = plan.subjectName;
      
      // Khởi tạo nếu khối này chưa có trong grades
      if (!entry.grades[plan.grade]) {
        entry.grades[plan.grade] = emptyGradeData();
      }
      
      entry.grades[plan.grade] = {
          totalHk1: plan.totalHk1 ? plan.totalHk1.toString() : "",
          totalHk2: plan.totalHk2 ? plan.totalHk2.toString() : "",
          totalYear: plan.totalYear ? plan.totalYear.toString() : "",
          periodsPerWeekHk1: plan.periodsPerWeekHk1 ? plan.periodsPerWeekHk1.toString() : "",
          periodsPerWeekHk2: plan.periodsPerWeekHk2 ? plan.periodsPerWeekHk2.toString() : "",
        };
    });
    setMatrices(Array.from(map.values()));
  }, [initialData]);

  const handleEdit = (matrix: MatrixPlan) => {
    setIsAdding(false);
    setIsEditing(matrix.subjectName);
    // Deep clone
    setFormData(JSON.parse(JSON.stringify(matrix)));
  };

  const handleSave = async () => {
    if (!formData.subjectName.trim()) {
      alert("Tên môn học không được để trống!");
      return;
    }
    
    // Auto calculate CN if not provided but HK1 and HK2 are
    supportedGrades.forEach(g => {
      const d = formData.grades[g];
      if (d && d.totalHk1 && d.totalHk2 && !d.totalYear) {
        d.totalYear = (parseInt(d.totalHk1) + parseInt(d.totalHk2)).toString();
      }
    });

    const res = await saveSubjectMatrix(
      schoolYear,
      formData.subjectName,
      isEditing || "",
      formData.grades
    );

    if (res.success) {
      if (isEditing) {
        setMatrices(
          matrices.map((m) => (m.subjectName === isEditing ? formData : m))
        );
        setIsEditing(null);
      } else {
        setMatrices([...matrices, formData]);
        setIsAdding(false);
      }
    } else {
      alert("Lỗi: " + res.error);
    }
  };

  const handleDelete = async (subjectName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa môn ${subjectName}?`)) return;
    const res = await deleteSubjectMatrix(schoolYear, subjectName);
    if (res.success) {
      setMatrices(matrices.filter((m) => m.subjectName !== subjectName));
    } else {
      alert("Lỗi: " + res.error);
    }
  };

  const handleGradeChange = (grade: number, field: keyof GradeData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      grades: {
        ...prev.grades,
        [grade]: {
          ...(prev.grades[grade] || emptyGradeData()),
          [field]: value,
        },
      },
    }));
  };

  const filteredMatrices = matrices.filter((m) =>
    m.subjectName.toLowerCase().includes(filterSubject.toLowerCase())
  );

  const renderRow = (matrix: MatrixPlan, index: number) => {
    const isEditingThis = isEditing === matrix.subjectName;
    const dataToRender = isEditingThis ? formData : matrix;

    if (isEditingThis) {
      return (
        <tr key={`edit-${matrix.subjectName}`} className="bg-indigo-50 border-b">
          <td className="px-4 py-3 text-center font-medium">{index + 1}</td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={formData.subjectName}
              onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
              className="w-full px-3 py-2 min-w-[140px] border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </td>
          {supportedGrades.map((grade) => {
            return (
              <td key={grade} className="px-3 py-3 border-r border-gray-200" colSpan={3}>
                <div className="flex gap-1.5 justify-center">
                  <input
                    type="number"
                    placeholder="HK1"
                    value={formData.grades[grade]?.totalHk1 || ""}
                    onChange={(e) => handleGradeChange(grade, "totalHk1", e.target.value)}
                    className="w-14 px-2 py-2 text-center border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="HK2"
                    value={formData.grades[grade]?.totalHk2 || ""}
                    onChange={(e) => handleGradeChange(grade, "totalHk2", e.target.value)}
                    className="w-14 px-2 py-2 text-center border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="CN"
                    value={formData.grades[grade]?.totalYear || ""}
                    onChange={(e) => handleGradeChange(grade, "totalYear", e.target.value)}
                    className="w-16 px-2 py-2 text-center border border-indigo-300 rounded-lg font-bold text-indigo-700 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </td>
            );
          })}
          <td className="px-5 py-3 border-l border-gray-200">
            <div className="flex gap-3 justify-center">
              <button onClick={handleSave} className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors" title="Lưu">
                <Save size={18} />
              </button>
              <button onClick={() => setIsEditing(null)} className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors" title="Hủy">
                <X size={18} />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={matrix.subjectName} className="border-b hover:bg-gray-50">
        <td className="px-4 py-4 text-center text-gray-500 border-r border-gray-200">{index + 1}</td>
        <td className="px-4 py-4 font-medium text-gray-900 w-32 min-w-[100px] max-w-[160px] whitespace-normal break-words border-r border-gray-200">{matrix.subjectName}</td>
        {supportedGrades.map((grade) => (
          <td key={grade} className="px-0 py-3 border-r border-gray-200" colSpan={3}>
            <div className="flex text-sm text-center">
              <div className="flex-1 px-1 border-r border-gray-200">{dataToRender.grades[grade]?.totalHk1 || "-"}</div>
              <div className="flex-1 px-1 border-r border-gray-200">{dataToRender.grades[grade]?.totalHk2 || "-"}</div>
              <div className="flex-1 px-1 font-bold text-gray-700 bg-gray-50">{dataToRender.grades[grade]?.totalYear || "-"}</div>
            </div>
          </td>
        ))}
        <td className="px-5 py-4 border-l border-gray-200">
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleEdit(matrix)} className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Sửa">
              <Edit2 size={18} />
            </button>
            <button onClick={() => handleDelete(matrix.subjectName)} className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Xóa">
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/80 gap-6">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900 whitespace-nowrap">Tổng hợp Kế hoạch giáo dục</h3>
          <p className="text-sm text-gray-500 mt-1">Năm học {schoolYear} • Nhập số tiết theo Khối & Học kỳ</p>
        </div>

        <div className="flex-1 max-w-md ml-auto">
          <input
            type="text"
            placeholder="Lọc môn học..."
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full px-5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
          />
        </div>

        <button
          onClick={() => {
            setIsEditing(null);
            setIsAdding(true);
            setFormData(createEmptyMatrix(supportedGrades));
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-all shadow-md hover:shadow-lg whitespace-nowrap"
          style={{ padding: '10px 24px' }}
        >
          <Plus size={20} /> Thêm môn học
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-[#1a1c23] text-white">
            <tr>
              <th rowSpan={2} className="px-4 py-3 bg-gray-100 font-semibold border text-gray-700 text-center w-16">STT</th>
              <th rowSpan={2} className="px-4 py-3 bg-gray-100 font-semibold border text-gray-700 w-32 min-w-[100px] max-w-[160px] whitespace-normal break-words">Môn học</th>
              {supportedGrades.map(g => (
                <th key={g} colSpan={3} className="px-4 py-2 bg-indigo-50 font-semibold border text-indigo-800 text-center">
                  Khối {g}
                </th>
              ))}
              <th rowSpan={2} className="px-5 py-3 bg-gray-100 font-semibold border text-gray-700 text-center w-28">Thao tác</th>
            </tr>
            <tr>
              {supportedGrades.map(g => (
                <Fragment key={`sub-${g}`}>
                  <th className="px-2 py-2 bg-gray-50 font-medium text-gray-600 border border-t-0 text-center text-xs w-16">HK1</th>
                  <th className="px-2 py-2 bg-gray-50 font-medium text-gray-600 border border-t-0 text-center text-xs w-16">HK2</th>
                  <th className="px-2 py-2 bg-gray-100 font-bold text-gray-700 border border-t-0 text-center text-xs w-16 shadow-inner">CN</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {isAdding && (
              <tr className="bg-indigo-50/50 border-b shadow-inner">
                <td className="px-4 py-4 text-center text-indigo-400 font-bold">*</td>
                <td className="px-4 py-4">
                  <input
                    type="text"
                    placeholder="Tên môn..."
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 min-w-[140px] border border-indigo-300 rounded-lg text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </td>
                {supportedGrades.map((g) => {
                  const grade = g;
                  return (
                    <td key={grade} className="px-3 py-4 border-r border-gray-200" colSpan={3}>
                      <div className="flex gap-1.5 justify-center">
                        <input
                          type="number"
                          placeholder="HK1"
                          value={formData.grades[grade].totalHk1}
                          onChange={(e) => handleGradeChange(grade, "totalHk1", e.target.value)}
                          className="w-14 px-2 py-2 text-center border border-indigo-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          placeholder="HK2"
                          value={formData.grades[grade].totalHk2}
                          onChange={(e) => handleGradeChange(grade, "totalHk2", e.target.value)}
                          className="w-14 px-2 py-2 text-center border border-indigo-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          placeholder="CN"
                          value={formData.grades[grade].totalYear}
                          onChange={(e) => handleGradeChange(grade, "totalYear", e.target.value)}
                          className="w-16 px-2 py-2 text-center border border-indigo-400 rounded-lg font-bold text-indigo-800 bg-indigo-100 placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </td>
                  );
                })}
                <td className="px-5 py-4 border-l border-gray-200">
                  <div className="flex gap-3 justify-center">
                    <button onClick={handleSave} className="text-green-600 hover:text-green-800 bg-green-100 hover:bg-green-200 p-2 rounded-lg transition-colors" title="Lưu">
                      <Save size={18} />
                    </button>
                    <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-colors" title="Hủy">
                      <X size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {filteredMatrices.map((matrix, idx) => renderRow(matrix, idx))}
            {filteredMatrices.length === 0 && !isAdding && (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <p className="mt-2 text-sm font-medium">Chưa có kế hoạch giáo dục nào</p>
                    <button onClick={() => setIsAdding(true)} className="mt-3 text-indigo-600 hover:underline text-sm">
                      Tạo kế hoạch đầu tiên
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
