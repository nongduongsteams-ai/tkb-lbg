const fs = require('fs');
const files = [
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary-branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/primary/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/branch/TimetableClient.tsx',
  'd:/NONG VAN DUONG EDU/Project AI 2026/TKB-LBG/web/src/app/dashboard/timetable/main-secondary/TimetableClient.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Remove drag handlers
  content = content.replace(/onMouseDown=\{handleMouseDown\}/g, '');
  content = content.replace(/onMouseLeave=\{handleMouseLeave\}/g, '');
  content = content.replace(/onMouseUp=\{handleMouseUp\}/g, '');
  content = content.replace(/onMouseMove=\{handleMouseMove\}/g, '');
  content = content.replace(/className=\{\w-full max-w-full overflow-auto flex-1 custom-scrollbar min-h-0 relative \\\$\\\{isDragging\.current \? 'select-none' : ''\\\}\\}/g, 'className="w-full max-w-full overflow-auto flex-1 custom-scrollbar min-h-0 relative"');

  // 2. Change default updateType to LAP_GIO
  content = content.replace(/const \[updateType, setUpdateType\] = useState\<'TEACHING' \| 'LAP_GIO'\>\('TEACHING'\);/g, "const [updateType, setUpdateType] = useState<'TEACHING' | 'LAP_GIO'>('LAP_GIO');");

  // 3. Swap the positions in the modal
  const label1Match = content.match(/<label className="flex items-center gap-2 cursor-pointer border p-3 rounded hover:bg-gray-50">[\s\S]*?<\/label>/g);
  
  if (label1Match && label1Match.length >= 2) {
    if (label1Match[0].includes('"TEACHING"') && label1Match[1].includes('"LAP_GIO"')) {
        content = content.replace(label1Match[0], '%%LABEL2%%');
        content = content.replace(label1Match[1], label1Match[0]);
        content = content.replace('%%LABEL2%%', label1Match[1]);
    }
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Updated', file);
});
