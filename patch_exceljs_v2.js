const fs = require('fs');
const path = require('path');

const files = [
  'src/app/dashboard/timetable/primary/TimetableClient.tsx',
  'src/app/dashboard/timetable/branch/TimetableClient.tsx',
  'src/app/dashboard/timetable/main-secondary/TimetableClient.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Change newline to dash
  if (content.includes('rowData.push(`${subjectName}\\n${teacherName}`);')) {
    content = content.replace(
      /rowData\.push\(`\$\{subjectName\}\\n\$\{teacherName\}`\);/g,
      "rowData.push(`${subjectName} - ${teacherName}`);"
    );
    changed = true;
  }

  // 2. Remove row.height = 35
  if (content.includes('row.height = 35;')) {
    content = content.replace(/row\.height = 35;\s*/g, "");
    changed = true;
  }

  // 3. Add pageSetup
  if (content.includes("const worksheet = workbook.addWorksheet('ThoiKhoaBieu');") && !content.includes("worksheet.pageSetup = {")) {
    content = content.replace(
      "const worksheet = workbook.addWorksheet('ThoiKhoaBieu');",
      "const worksheet = workbook.addWorksheet('ThoiKhoaBieu');\n\n      // Setup trang in\n      worksheet.pageSetup = {\n        paperSize: 9,\n        orientation: 'landscape',\n        fitToPage: true,\n        fitToWidth: 1,\n        fitToHeight: 1,\n        margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.1, footer: 0.1 }\n      };"
    );
    changed = true;
  }
  
  // 4. Update widths to be slightly wider if they are on 1 line
  if (content.includes('worksheet.getColumn(i).width = 16;')) {
    content = content.replace(/worksheet\.getColumn\(i\)\.width = 16;/g, "worksheet.getColumn(i).width = 18;");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
