"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAssignments(schoolYear: string) {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { schoolYear },
      include: {
        teacher: true,
        subject: true,
        class: true,
      },
      orderBy: [
        { teacher: { name: "asc" } },
        { class: { name: "asc" } }
      ]
    });
    return { success: true, data: assignments };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách phân công:", error);
    return { success: false, error: error.message };
  }
}

export async function createAssignments(data: {
  teacherId: string;
  subjectId: string;
  classIds: string[];
  roleNote?: string;
  schoolYear: string;
}) {
  try {
    const results = [];
    for (const classId of data.classIds) {
      const existing = await prisma.assignment.findFirst({
        where: {
          teacherId: data.teacherId,
          subjectId: data.subjectId,
          classId: classId,
        }
      });
      if (!existing) {
        const created = await prisma.assignment.create({
          data: {
            teacherId: data.teacherId,
            subjectId: data.subjectId,
            classId: classId,
            roleNote: data.roleNote,
            schoolYear: data.schoolYear
          },
          include: { teacher: true, subject: true, class: true }
        });
        results.push(created);
      }
    }
    revalidatePath("/dashboard/assignments");
    return { success: true, data: results };
  } catch (error: any) {
    console.error("Lỗi thêm nhiều phân công:", error);
    return { success: false, error: error.message };
  }
}

export async function createAssignment(data: {
  teacherId: string;
  subjectId: string;
  classId: string;
  schoolYear: string;
  roleNote?: string;
}) {
  try {
    const existing = await prisma.assignment.findUnique({
      where: {
        teacherId_subjectId_classId_schoolYear: {
          teacherId: data.teacherId,
          subjectId: data.subjectId,
          classId: data.classId,
          schoolYear: data.schoolYear
        }
      }
    });

    if (existing) {
      return { success: false, error: "Phân công này đã tồn tại." };
    }

    const newAssign = await prisma.assignment.create({
      data,
      include: { teacher: true, subject: true, class: true }
    });

    revalidatePath("/dashboard/assignments");
    return { success: true, data: newAssign };
  } catch (error: any) {
    console.error("Lỗi tạo phân công:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAssignment(id: string, data: {
  teacherId: string;
  subjectId: string;
  classId: string;
  roleNote?: string;
}) {
  try {
    // Check if new assignment conflicts (same teacher, subject, class but different ID)
    const existing = await prisma.assignment.findFirst({
      where: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        classId: data.classId,
        id: { not: id }
      }
    });

    if (existing) {
      return { success: false, error: "Phân công này đã tồn tại ở bản ghi khác." };
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data,
      include: { teacher: true, subject: true, class: true }
    });

    revalidatePath("/dashboard/assignments");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Lỗi sửa phân công:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAssignment(id: string) {
  try {
    await prisma.assignment.delete({ where: { id } });
    revalidatePath("/dashboard/assignments");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa phân công:", error);
    return { success: false, error: error.message };
  }
}

// Khử dấu Unicode để so sánh không phân biệt dấu
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

// Tìm môn học trong DB bằng fuzzy matching theo tên DB thực tế
function findSubjectInDB(rawSubject: string, allSubjects: any[], grade: number): any | null {
  const raw = removeAccents(rawSubject);

  // Bảng map thông minh: từ khóa trong file -> từ khóa trong tên DB
  // LƯU Ý: thứ tự quan trọng! Rule nào khớp trước sẽ được dùng.
  const subjectKeywordMap: { test: (s: string) => boolean; dbKeyword: string }[] = [
    // KHTN phân môn - dùng dấu ngoặc "(ly)" "(li)" "(hoa)" "(sinh)" để khớp chính xác. 
    // TRÁNH lỗi chữ "khoa" có chứa "hoa", nên dùng \b (word boundary) nếu dùng regex
    { test: s => s.includes('(ly)') || s.includes('(li)') || /\bvat ly\b|\bvat li\b/.test(s), dbKeyword: 'khoa hoc tu nhien (ly)' },
    { test: s => s.includes('(hoa)') || /\bhoa hoc\b/.test(s.replace('khoa hoc', '')), dbKeyword: 'khoa hoc tu nhien (hoa)' },
    { test: s => s.includes('(sinh)') || /\bsinh hoc\b/.test(s), dbKeyword: 'khoa hoc tu nhien (sinh)' },
    // Lịch sử Địa lí - khớp theo phân môn trong ngoặc
    { test: s => s.includes('(su)') || (s.includes('lich su') && !s.includes('(dia)')), dbKeyword: 'lich su va dia li (su)' },
    { test: s => s.includes('(dia)') || (s.includes('dia') && !s.includes('lich su') && !s.includes('gddp') && !s.includes('dia phuong')), dbKeyword: 'lich su va dia li (dia)' },
    // Nghệ thuật - dùng cụm đầy đủ thay vì 'an' mơ hồ
    { test: s => s.includes('am nhac') || s.includes('(am'), dbKeyword: 'nghe thuat (am nhac)' },
    { test: s => s.includes('mi thuat') || s.includes('my thuat') || s.includes('(mi'), dbKeyword: 'nghe thuat (mi thuat)' },
    // HĐTNHN
    { test: s => s.includes('hdtnhn') || s.includes('hdtn') || s.includes('hoat dong'), dbKeyword: 'hdtn, hn (tn cd)' },
    // Ngoại ngữ / Tiếng Anh
    { test: s => s.includes('tieng anh') || s.includes('ngoai ngu'), dbKeyword: 'ngoai ngu 1' },
    // Các môn đơn - khớp chính xác để tránh nhầm
    { test: s => s === 'toan' || s.includes('toan hoc'), dbKeyword: 'toan' },
    { test: s => s.includes('ngu van') || s === 'van', dbKeyword: 'ngu van' },
    { test: s => s.includes('tin hoc') || s === 'tin', dbKeyword: 'tin hoc' },
    { test: s => s.includes('cong nghe'), dbKeyword: 'cong nghe' },
    { test: s => s.includes('gdtc') || s.includes('the duc'), dbKeyword: 'gdtc' },
    { test: s => s === 'gdcd' || s.includes('giao duc cong dan'), dbKeyword: 'gdcd' },
    { test: s => s.includes('gddp') || s.includes('dia phuong'), dbKeyword: 'gddp' },
  ];


  let targetDbKeyword: string | null = null;
  for (const rule of subjectKeywordMap) {
    if (rule.test(raw)) {
      targetDbKeyword = removeAccents(rule.dbKeyword);
      break;
    }
  }

  if (!targetDbKeyword) return null;

  // Tìm trong DB theo khối và keyword
  return allSubjects.find((s: any) => 
    s.grade === grade && removeAccents(s.name).includes(targetDbKeyword!)
  ) || null;
}

// Fuzzy match tên giáo viên: tìm tên GV trong DB gần nhất với tên trong file
function findTeacherInDB(teacherName: string, allUsers: any[]): any | null {
  const rawInput = removeAccents(teacherName);

  // Bước 1: Tìm chính xác (khử dấu)
  const exactMatch = allUsers.find((u: any) => removeAccents(u.name) === rawInput);
  if (exactMatch) return exactMatch;

  // Bước 2: Tìm bằng cách kiểm tra từng từ (họ & tên)
  // Tách tên (phần cuối) để so sánh - Vd "Nguyễn Văn A" -> "A"
  const inputParts = rawInput.split(' ').filter(Boolean);
  const inputFirstname = inputParts[inputParts.length - 1]; // tên (chữ cuối)
  const inputMiddlename = inputParts.length > 2 ? inputParts[inputParts.length - 2] : ''; // đệm

  let bestMatch: any = null;
  let bestScore = 0;

  for (const u of allUsers) {
    const dbRaw = removeAccents(u.name);
    const dbParts = dbRaw.split(' ').filter(Boolean);
    const dbFirstname = dbParts[dbParts.length - 1];
    const dbMiddlename = dbParts.length > 2 ? dbParts[dbParts.length - 2] : '';

    let score = 0;
    // Họ khớp (+2), tên khớp (+4), đệm khớp (+2)
    if (dbParts[0] === inputParts[0]) score += 2; // họ
    if (dbFirstname === inputFirstname) score += 4; // tên
    if (dbMiddlename && inputMiddlename && dbMiddlename === inputMiddlename) score += 2; // đệm
    
    // Nếu tên khác nhau nhưng giống chữ cái đầu (VD: Sơn - Sâm) -> vớt +1 điểm
    if (dbFirstname !== inputFirstname && dbFirstname[0] === inputFirstname[0]) {
      score += 1;
    }

    // Tất cả chữ cái của inputParts có trong dbParts
    if (inputParts.every((p: string) => dbParts.some((d: string) => d === p || (p.length > 2 && (d.startsWith(p) || p.startsWith(d)))))) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = u;
    }
  }

  // Chấp nhận nếu điểm >= 5 (VD: Họ(2) + Đệm(2) + Ký tự đầu Tên(1) = 5 -> Khớp Sơn với Sâm)
  return bestScore >= 5 ? bestMatch : null;
}

// Phân tách chuỗi lớp (VD: "6bc", "8 cd", "9a") thành mảng ["6B", "6C", "8C", "8D", "9A"]
function parseClasses(classStr: string): string[] {
  const results: string[] = [];
  const parts = classStr.split(',').map(s => s.trim()).filter(s => s);
  
  for (let part of parts) {
    const match = part.match(/([6-9])\s*([a-zA-Z]+)/);
    if (match) {
      const grade = match[1];
      const letters = match[2].split('');
      for (let l of letters) {
        if (l.trim()) {
          results.push(`${grade}${l.toUpperCase()}`);
        }
      }
    } else {
      results.push(part.toUpperCase());
    }
  }
  return results;
}

export async function importAssignmentsFromMarkdown(markdownText: string, schoolYear: string, clearOld: boolean = false) {
  try {
    if (clearOld) {
      await prisma.assignment.deleteMany({ where: { schoolYear } });
    }

    const lines = markdownText.split('\n');
    let importedCount = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Pre-fetch DB lookups
    const allUsers = await prisma.user.findMany();
    const allSubjects = await prisma.subject.findMany();
    const allClasses = await prisma.class.findMany({ where: { schoolYear } });

    let nameColIdx = -1;
    let assignColIdx = -1;

    // Iterate table rows
    for (const line of lines) {
      if (!line.trim().startsWith('|')) continue;
      if (line.includes('|---|')) continue;

      const columns = line.split('|').map(c => c.trim());
      
      // Detect headers
      if (nameColIdx === -1 || assignColIdx === -1) {
        columns.forEach((col, idx) => {
          const lowerCol = col.toLowerCase();
          if (lowerCol.includes('họ và tên') || lowerCol.includes('họ tên') || lowerCol === 'giáo viên') nameColIdx = idx;
          if (lowerCol.includes('nhiệm vụ') || lowerCol.includes('phân công')) assignColIdx = idx;
        });
        if (nameColIdx !== -1 && assignColIdx !== -1) continue;
      }

      if (nameColIdx === -1 || assignColIdx === -1 || columns.length <= Math.max(nameColIdx, assignColIdx)) continue; 

      const fullNameStr = columns[nameColIdx];
      const assignmentStr = columns[assignColIdx];
      if (!fullNameStr || !assignmentStr) continue;

      // Xóa tiền tố "Ông ", "Bà "
      let teacherName = fullNameStr.replace(/^(Ông|Bà)\s+/i, '').trim();
      
      // Fuzzy tìm giáo viên
      const teacher = findTeacherInDB(teacherName, allUsers);
      if (!teacher) {
        errors.push(`❌ Không tìm thấy GV: "${teacherName}" (không khớp bất kỳ ai trong DB)`);
        continue;
      }
      
      // Log nếu tên không khớp chính xác (để cảnh báo)
      if (removeAccents(teacher.name) !== removeAccents(teacherName)) {
        warnings.push(`⚠️ GV "${teacherName}" → khớp gần đúng với "${teacher.name}" trong DB`);
      }

      // Parse phân công (split theo ; hoặc <br>)
      const chunks = assignmentStr.split(/<br>|;/).map(c => c.trim()).filter(c => c);

      for (let chunk of chunks) {
        // Bỏ qua các cụm không phải phân công dạy (VD: "TPT chuyên trách")
        if (!chunk.match(/[6-9][a-zA-Z]/)) continue;

        const match = chunk.match(/^(.+?)\s+([6-9][a-zA-Z0-9\s,]+?)(?:\s*\([\d,;LTTH\.]+\))?$/);
        if (!match) continue;

        const rawSubject = match[1].trim();
        const rawClasses = match[2].trim();
        const parsedClassNames = parseClasses(rawClasses);

        for (const className of parsedClassNames) {
          const classObj = allClasses.find(c => c.name === className);
          if (!classObj) {
            errors.push(`❌ Không tìm thấy lớp: "${className}" trong DB năm ${schoolYear}`);
            continue;
          }

          // Fuzzy tìm môn học theo grade
          const subject = findSubjectInDB(rawSubject, allSubjects, classObj.grade);
          if (!subject) {
            errors.push(`❌ Không map được môn: "${rawSubject}" cho khối ${classObj.grade}`);
            continue;
          }

          try {
            await prisma.assignment.upsert({
              where: {
                teacherId_subjectId_classId_schoolYear: {
                  teacherId: teacher.id,
                  subjectId: subject.id,
                  classId: classObj.id,
                  schoolYear: schoolYear
                }
              },
              update: {},
              create: {
                teacherId: teacher.id,
                subjectId: subject.id,
                classId: classObj.id,
                schoolYear: schoolYear,
                roleNote: null
              }
            });
            importedCount++;
          } catch (e) {
            // ignore duplicate
          }
        }
      }
    }

    revalidatePath("/dashboard/assignments");
    return { success: true, count: importedCount, errors: [...warnings, ...errors] };
  } catch (error: any) {
    console.error("Lỗi Import Markdown:", error);
    return { success: false, error: error.message };
  }
}
