const fs = require('fs');

function patchPage(path, title, branch, level) {
  let code = fs.readFileSync(path, 'utf8');
  
  // Replace the branch and add level
  code = code.replace(
    /const branch = 'Phân hiệu';/,
    `const branch = '${branch}';\n  const level = '${level}';`
  );

  // Update title
  code = code.replace(
    /<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thời Khoá Biểu Phân Hiệu<\/h1>/,
    `<h1 className="text-2xl font-bold text-gray-900 dark:text-white">${title}</h1>`
  );

  // Pass level to actions
  code = code.replace(
    /getBranchTimetable\(weekNumber, schoolYear, branch\)/,
    `getBranchTimetable(weekNumber, schoolYear, branch, level)`
  );
  code = code.replace(
    /getDashboardStats\(weekNumber, schoolYear, branch\)/,
    `getDashboardStats(weekNumber, schoolYear, branch, level)`
  );

  // Pass branch and level to TimetableClient
  code = code.replace(
    /<TimetableClient \n\s*weekNumber=\{weekNumber\}/,
    `<TimetableClient \n        branch={branch}\n        level={level}\n        weekNumber={weekNumber}`
  );

  fs.writeFileSync(path, code);
}

function patchDetailedPage(path, title, branch, level) {
  let code = fs.readFileSync(path, 'utf8');
  
  code = code.replace(
    /const branch = 'Phân hiệu';/,
    `const branch = '${branch}';\n  const level = '${level}';`
  );

  code = code.replace(
    /<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Thời Khoá Biểu Chi Tiết Phân Hiệu<\/h1>/,
    `<h1 className="text-2xl font-bold text-gray-900 dark:text-white">${title}</h1>`
  );

  code = code.replace(
    /getBranchTimetable\(weekNumber, schoolYear, branch\)/,
    `getBranchTimetable(weekNumber, schoolYear, branch, level)`
  );

  // Check if DetailedClient is used and pass props if needed. DetailedClient currently only gets slots, classes, assignments. It doesn't fetch on its own.
  
  // We should also patch the 'back' link if it exists
  code = code.replace(
    /href="\/dashboard\/timetable\/branch"/,
    `href="${path.includes('primary') ? '/dashboard/timetable/primary' : '/dashboard/timetable/main-secondary'}"`
  );

  fs.writeFileSync(path, code);
}

// 1. primary
patchPage('src/app/dashboard/timetable/primary/page.tsx', 'Thời Khoá Biểu Tiểu Học', 'Trường chính', 'PRIMARY');
patchDetailedPage('src/app/dashboard/timetable/primary/detailed/page.tsx', 'TKB Chi Tiết - Tiểu Học', 'Trường chính', 'PRIMARY');

// 2. main-secondary
patchPage('src/app/dashboard/timetable/main-secondary/page.tsx', 'Thời Khoá Biểu THCS - Trường Chính', 'Trường chính', 'SECONDARY');
patchDetailedPage('src/app/dashboard/timetable/main-secondary/detailed/page.tsx', 'TKB Chi Tiết THCS - Trường Chính', 'Trường chính', 'SECONDARY');

// 3. branch
patchPage('src/app/dashboard/timetable/branch/page.tsx', 'Thời Khoá Biểu THCS - Phân Hiệu', 'Phân hiệu', 'ALL'); // or SECONDARY, but Phân hiệu only has secondary anyway
patchDetailedPage('src/app/dashboard/timetable/branch/detailed/page.tsx', 'TKB Chi Tiết THCS - Phân Hiệu', 'Phân hiệu', 'ALL');

console.log('patched pages');
