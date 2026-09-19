"use client";

import { useState, useEffect, useMemo } from "react";
import { WeeklySchoolPlan, SchoolPlan } from "@prisma/client";
import { saveDetailedSchoolPlans, deleteDetailedSchoolPlan } from "@/actions/detailedSchoolPlan";
import { Plus, Edit2, Trash2, X, Save, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  initialWeeklyPlans: WeeklySchoolPlan[];
  generalPlans: SchoolPlan[];
  schoolYear: string;
  userRole?: string;
}

interface PlanRow {
  id: string; // virtual ID for React keys
  grade: number;
  subjectName: string;
  hk1: string[]; // 18 weeks
  hk2: string[]; // 17 weeks
  isNew?: boolean;
}

// 18 for HK1, 17 for HK2
const HK1_WEEKS = 18;
const HK2_WEEKS = 17;

function getParentSubject(subName: string): string {
  const lower = subName.toLowerCase();
  if (lower.includes("khoa học tự nhiên") || lower.includes("khtn")) return "KHTN";
  if (lower.includes("lịch sử và địa lí") || lower.includes("ls và đl")) return "LS và ĐL";
  if (lower.includes("trải nghiệm") || lower.includes("hđtn")) return "HĐTNHN";
  if (lower.includes("nghệ thuật")) return "Nghệ thuật";
  if (lower.includes("công nghệ")) return "Công nghệ";
  
  // Clean up grade numbers from names if any
  let cleanName = subName.replace(/[6789]/g, "").trim();
  return subName; // Return original if no special rule
}

export default function DetailedPlanClient({ initialWeeklyPlans, generalPlans, schoolYear, userRole }: Props) {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<PlanRow | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("Tất cả");

  // Derive available parent subjects for filter
  const parentSubjects = useMemo(() => {
    const subjects = new Set<string>();
    rows.forEach(r => subjects.add(getParentSubject(r.subjectName)));
    return ["Tất cả", ...Array.from(subjects).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filterSubject === "Tất cả") return rows;
    return rows.filter(r => getParentSubject(r.subjectName) === filterSubject);
  }, [rows, filterSubject]);

  // Group initial data by (grade, subjectName)
  useEffect(() => {
    const map = new Map<string, PlanRow>();
    
    initialWeeklyPlans.forEach(plan => {
      const key = `${plan.grade}-${plan.subjectName}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          grade: plan.grade,
          subjectName: plan.subjectName,
          hk1: Array(HK1_WEEKS).fill(""),
          hk2: Array(HK2_WEEKS).fill(""),
        });
      }
      const entry = map.get(key)!;
      const data = plan.weeklyData as string[];
      if (plan.semester === 1) {
        entry.hk1 = [...(data || [])];
        while (entry.hk1.length < HK1_WEEKS) entry.hk1.push("");
      } else {
        entry.hk2 = [...(data || [])];
        while (entry.hk2.length < HK2_WEEKS) entry.hk2.push("");
      }
    });

    setRows(Array.from(map.values()));
  }, [initialWeeklyPlans]);

  // Map to fast lookup parent general plan target
  const generalPlanMap = useMemo(() => {
    const map = new Map<string, number>();
    generalPlans.forEach(gp => {
      map.set(`${gp.grade}-${gp.subjectName}`, gp.totalYear);
    });
    return map;
  }, [generalPlans]);

  // Helper to calculate total for an array of strings
  const sumArray = (arr: string[]) => arr.reduce((acc, val) => acc + (parseInt(val) || 0), 0);

  // Analyze validity for each parent subject
  const parentValidation = useMemo(() => {
    const sums = new Map<string, number>();
    
    // Sum current details
    rows.forEach(row => {
      const parentName = getParentSubject(row.subjectName);
      const key = `${row.grade}-${parentName}`;
      const total = sumArray(row.hk1) + sumArray(row.hk2);
      sums.set(key, (sums.get(key) || 0) + total);
    });

    const validation = new Map<string, { expected: number, actual: number, isWarning: boolean }>();
    sums.forEach((actualTotal, key) => {
      // Find in general map using exact match, or try to fallback
      let expected = generalPlanMap.get(key);
      
      // If exact doesn't match, maybe the name differs slightly in DB
      if (expected === undefined) {
        const [gradeStr, ...nameParts] = key.split("-");
        const name = nameParts.join("-");
        const found = generalPlans.find(g => g.grade === parseInt(gradeStr) && getParentSubject(g.subjectName) === name);
        if (found) expected = found.totalYear;
      }

      if (expected !== undefined) {
        validation.set(key, { expected, actual: actualTotal, isWarning: expected !== actualTotal });
      }
    });
    return validation;
  }, [rows, generalPlans, generalPlanMap]);

  const handleAdd = () => {
    const newId = `new-${Date.now()}`;
    const newRow: PlanRow = {
      id: newId,
      grade: 6,
      subjectName: "",
      hk1: Array(HK1_WEEKS).fill(""),
      hk2: Array(HK2_WEEKS).fill(""),
      isNew: true
    };
    setIsEditing(newId);
    setEditFormData(newRow);
  };

  const handleEdit = (row: PlanRow) => {
    setIsEditing(row.id);
    setEditFormData({
      ...row,
      hk1: [...row.hk1],
      hk2: [...row.hk2]
    });
  };

  const handleSave = async () => {
    if (!editFormData) return;
    if (!editFormData.subjectName.trim()) {
      alert("Vui lòng nhập tên phân môn!");
      return;
    }

    const payload = [
      {
        grade: editFormData.grade,
        subjectName: editFormData.subjectName,
        weeklyData: semester === 1 ? editFormData.hk1 : editFormData.hk2
      }
    ];

    const res = await saveDetailedSchoolPlans(schoolYear, semester, payload);
    if (res.success) {
      if (editFormData.isNew) {
        editFormData.isNew = false;
        setRows([...rows, editFormData]);
      } else {
        setRows(rows.map(r => r.id === editFormData.id ? editFormData : r));
      }
      setIsEditing(null);
      setEditFormData(null);
    } else {
      alert("Lỗi: " + res.error);
    }
  };

  const handleDelete = async (row: PlanRow) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phân môn ${row.subjectName} của Khối ${row.grade}?`)) return;
    const res = await deleteDetailedSchoolPlan(schoolYear, row.grade, row.subjectName);
    if (res.success) {
      setRows(rows.filter(r => r.id !== row.id));
    } else {
      alert("Lỗi: " + res.error);
    }
  };

  const handleWeekChange = (index: number, val: string) => {
    if (!editFormData) return;
    setEditFormData(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (semester === 1) {
        updated.hk1 = [...prev.hk1];
        updated.hk1[index] = val;
      } else {
        updated.hk2 = [...prev.hk2];
        updated.hk2[index] = val;
      }
      return updated;
    });
  };

  const weeksCount = semester === 1 ? HK1_WEEKS : HK2_WEEKS;
  const renderHeaders = () => {
    const headers = [];
    for (let i = 1; i <= weeksCount; i++) {
      headers.push(<th key={i} className="px-1 py-2 border-r border-[#2d3748] w-8 text-center text-[10px]">T{i}</th>);
    }
    return headers;
  };

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Kế hoạch giáo dục chi tiết</h3>
            <p className="text-xs text-gray-500">Năm học {schoolYear} • Chi tiết phân bổ số tiết theo từng tuần</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Lọc theo môn:</span>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 min-w-[150px] outline-none"
              >
                {parentSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            
            {userRole !== 'GV' && (
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                style={{ padding: '10px 20px' }}
              >
                <Plus size={20} /> Thêm phân môn
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-6 border-b border-gray-200">
          <button 
            className={`font-semibold text-sm transition-colors relative ${semester === 1 ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setSemester(1)}
            style={{ padding: '12px 16px' }}
          >
            Học kỳ 1 (18 tuần)
            {semester === 1 && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] rounded-t-md bg-indigo-600" />}
          </button>
          <button 
            className={`font-semibold text-sm transition-colors relative ${semester === 2 ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setSemester(2)}
            style={{ padding: '12px 16px' }}
          >
            Học kỳ 2 (17 tuần)
            {semester === 2 && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] rounded-t-md bg-indigo-600" />}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-[#1a1c23] text-white whitespace-nowrap">
            <tr>
              <th className="px-3 py-3 w-16 text-center border-r border-[#2d3748]">Khối</th>
              <th className="px-4 py-3 min-w-[200px] border-r border-[#2d3748]">Môn / Phân môn</th>
              {renderHeaders()}
              <th className="px-2 py-3 w-16 text-center border-r border-[#2d3748] text-[#DFE278]">T.Cộng HK</th>
              <th className="px-2 py-3 w-16 text-center border-r border-[#2d3748] text-green-400">Cả năm</th>
              <th className="px-3 py-3 text-center w-20">Trạng thái</th>
              <th className="px-3 py-3 text-center w-20">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {(isEditing && editFormData?.isNew ? [editFormData, ...filteredRows] : filteredRows).map((row) => {
              const isEditingThis = isEditing === row.id;
              const data = isEditingThis && editFormData ? editFormData : row;
              
              const currentArr = semester === 1 ? data.hk1 : data.hk2;
              const totalHK = sumArray(currentArr);
              const totalYear = sumArray(data.hk1) + sumArray(data.hk2);

              const parentName = getParentSubject(data.subjectName);
              const warningKey = `${data.grade}-${parentName}`;
              const validation = parentValidation.get(warningKey);

              return (
                <tr key={row.id} className={`border-b hover:bg-gray-50 ${isEditingThis ? 'bg-indigo-50/50' : ''}`}>
                  {/* Khối */}
                  <td className="px-3 py-3 border-r border-gray-200">
                    {isEditingThis ? (
                      <select 
                        value={data.grade} 
                        onChange={e => setEditFormData({...data, grade: parseInt(e.target.value)})}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {[6,7,8,9].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <div className="text-center font-bold text-gray-800">{data.grade}</div>
                    )}
                  </td>
                  
                  {/* Môn học */}
                  <td className="px-4 py-3 border-r border-gray-200">
                    {isEditingThis ? (
                      <input 
                        type="text" 
                        value={data.subjectName}
                        onChange={e => setEditFormData({...data, subjectName: e.target.value})}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-gray-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="VD: Khoa học tự nhiên (Lí)"
                      />
                    ) : (
                      <div className="font-semibold text-gray-900">{data.subjectName}</div>
                    )}
                  </td>

                  {/* Tuần 1 -> N */}
                  {currentArr.map((val, idx) => (
                    <td key={idx} className="px-1 py-1 border-r border-gray-200 text-center">
                      {isEditingThis ? (
                        <input
                          type="text"
                          value={val}
                          onChange={e => handleWeekChange(idx, e.target.value)}
                          className="w-full min-w-[32px] px-1 py-1.5 text-center bg-white border border-indigo-200 shadow-sm text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-gray-700 text-[13px] font-medium">{val || "-"}</span>
                      )}
                    </td>
                  ))}

                  {/* Tổng HK */}
                  <td className="px-3 py-3 border-r border-gray-200 text-center font-bold text-indigo-700 bg-indigo-50/50">
                    {totalHK}
                  </td>
                  
                  {/* Tổng Cả năm */}
                  <td className="px-3 py-3 border-r border-gray-200 text-center font-bold text-gray-900 bg-green-50">
                    {totalYear}
                  </td>

                  {/* Trạng thái / Cảnh báo */}
                  <td className="px-3 py-3 border-r border-gray-200 text-center">
                    {!isEditingThis && validation?.isWarning ? (
                      <div className="flex flex-col items-center justify-center text-red-600" title={`Lệch! Đang xếp: ${validation.actual} - Chuẩn: ${validation.expected}`}>
                        <AlertTriangle size={20} />
                        <span className="text-[11px] mt-1 font-bold whitespace-nowrap">Lệch ({validation.actual}/{validation.expected})</span>
                      </div>
                    ) : !isEditingThis && validation && !validation.isWarning ? (
                      <div className="flex flex-col items-center justify-center text-green-600" title={`Khớp: ${validation.actual} - Chuẩn: ${validation.expected}`}>
                        <CheckCircle2 size={20} />
                        <span className="text-[11px] mt-1 font-bold whitespace-nowrap">Khớp ({validation.actual}/{validation.expected})</span>
                      </div>
                    ) : null}
                  </td>

                  {/* Thao tác */}
                  <td className="px-3 py-3 text-center">
                    {isEditingThis ? (
                      <div className="flex gap-2 justify-center">
                        <button onClick={handleSave} className="text-green-600 hover:text-green-800 p-2 bg-green-50 rounded-lg transition-colors border border-green-200 shadow-sm" title="Lưu">
                          <Save size={18} />
                        </button>
                        <button onClick={() => { setIsEditing(null); setEditFormData(null); }} className="text-gray-500 hover:text-gray-700 p-2 bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm" title="Hủy">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEdit(row)} className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa">
                          <Edit2 size={18} />
                        </button>
                        {userRole !== 'GV' && (
                          <button onClick={() => handleDelete(row)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {rows.length === 0 && !isEditing && (
              <tr>
                <td colSpan={weeksCount + 5} className="px-4 py-12 text-center text-gray-500">
                  Chưa có dữ liệu kế hoạch chi tiết.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legend / Info */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex gap-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          <span>Có cảnh báo lệch số tiết (so với Kế hoạch chung của nhà trường)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-500" />
          <span>Khớp số tiết</span>
        </div>
      </div>
    </div>
  );
}
