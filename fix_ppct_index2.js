const fs = require('fs');
const files = [
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary-branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/main-secondary/TimetableClient.tsx'
];

const target = "  const periodNumMap = useMemo(() => {\n    const map = new Map<string, number>();\n    const byAssignment = new Map<string, any[]>();\n    for (const s of activeLocalSlots) {\n      if (s.weekNumber === weekNumber) {\n        if (!byAssignment.has(s.assignmentId)) byAssignment.set(s.assignmentId, []);\n        byAssignment.get(s.assignmentId)!.push(s);\n      }\n    }";

const replacement = "  const periodNumMap = useMemo(() => {\n    const map = new Map<string, number>();\n    const byAssignment = new Map<string, any[]>();\n    \n    const subSet = new Set<string>();\n    for (const s of activeLocalSlots) {\n      if (s.status === 'SUBSTITUTE' && s.assignment?.classId) {\n        subSet.add(\-\-\-\-\);\n      }\n    }\n\n    for (const s of activeLocalSlots) {\n      if (s.weekNumber === weekNumber) {\n        if (s.isOriginal && s.status !== 'SUBSTITUTE' && s.assignment?.classId) {\n          if (subSet.has(\-\-\-\-\)) {\n            continue;\n          }\n        }\n        if (!byAssignment.has(s.assignmentId)) byAssignment.set(s.assignmentId, []);\n        byAssignment.get(s.assignmentId)!.push(s);\n      }\n    }";

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("if (s.isOriginal && s.status !== 'SUBSTITUTE' && s.assignment?.classId)")) {
     console.log('Already updated', file);
  } else {
     content = content.replace(target, replacement);
     fs.writeFileSync(file, content, 'utf8');
     console.log('Updated', file);
  }
});
