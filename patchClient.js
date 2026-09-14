const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/timetable/branch/TimetableClient.tsx', 'utf8');

// signature
code = code.replace(
  /export default function TimetableClient\(\{\s*weekNumber,\s*schoolYear,\s*schoolWeek,\s*classes,\s*assignments,\s*slots:\s*initialSlots,\s*stats:\s*initialStats,\s*timetableNotes\s*=\s*\[\]\s*\}\s*:\s*any\)\s*\{/,
  `export default function TimetableClient({ weekNumber, schoolYear, schoolWeek, classes, assignments, slots: initialSlots, stats: initialStats, timetableNotes = [], branch = 'Phân hiệu', level = 'ALL' }: any) {`
);

// usages
code = code.replace(
  /rolloverWeek\(weekNumber, weekNumber \+ 1, '2026-2027', 'Phân hiệu'\)/g,
  `rolloverWeek(weekNumber, weekNumber + 1, '2026-2027', branch, level)`
);

// bulkDeleteSlots
code = code.replace(
  /bulkDeleteSlots\(\s*bulkDeleteMode,\s*weekNumber,\s*'2026-2027',\s*'Phân hiệu',\s*bulkFilterId\s*\|\|\s*undefined,\s*bulkStatus\s*\)/g,
  `bulkDeleteSlots(
      bulkDeleteMode,
      weekNumber,
      '2026-2027',
      branch,
      bulkFilterId || undefined,
      bulkStatus,
      level
    )`
);

code = code.replace(
  /importTimetableFromJSON\(parsedData, weekNumber, '2026-2027', 'Phân hiệu'\)/g,
  `importTimetableFromJSON(parsedData, weekNumber, '2026-2027', branch, level)`
);

code = code.replace(
  /saveTimetableNote\(weekNumber, day, session as any, val, '2026-2027', 'Phân hiệu'\)/g,
  `saveTimetableNote(weekNumber, day, session as any, val, '2026-2027', branch)`
);

fs.writeFileSync('src/app/dashboard/timetable/branch/TimetableClient.tsx', code);
console.log('patched client');
