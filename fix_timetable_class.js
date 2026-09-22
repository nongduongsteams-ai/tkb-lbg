const fs = require('fs');
const files = [
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary-branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/main-secondary/TimetableClient.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("className={\w-full max-w-full overflow-auto flex-1 custom-scrollbar min-h-0 relative \\}", 'className="w-full max-w-full overflow-auto flex-1 custom-scrollbar min-h-0 relative"');
  fs.writeFileSync(file, content, 'utf8');
});
