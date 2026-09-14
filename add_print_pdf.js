const fs = require('fs');
const path = require('path');

// 1. Update globals.css
const cssPath = path.join(__dirname, 'src/app/globals.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');
if (!cssContent.includes('@media print')) {
  cssContent += `\n
/* ═══════════════════════════════════════════════════════
   PRINT STYLES (A4 BLACK & WHITE, NO WATERMARK)
════════════════════════════════════════════════════════ */
@media print {
  @page {
    size: A4 landscape;
    margin: 1cm;
  }
  
  /* Ẩn các thành phần giao diện không cần in */
  nav, header, footer, button, .sidebar, .topbar, .no-print, [role="navigation"], [role="dialog"], [role="menu"] {
    display: none !important;
  }
  
  /* Reset nền và buộc đen trắng */
  body, html, main, .linear-card {
    background: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    overflow: visible !important;
    box-shadow: none !important;
    border: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  
  /* Đảm bảo bảng hiển thị đủ trang và nét viền */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
  }
  
  td, th {
    border: 1px solid #000 !important;
    color: black !important;
    background: transparent !important;
  }
  
  /* Chuyển tất cả chữ thành màu đen */
  * {
    color: black !important;
    text-shadow: none !important;
  }
  
  /* Ẩn Watermark */
  .watermark-text {
    display: none !important;
  }
}
`;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log('Updated globals.css');
}

// 2. Patch the 3 TimetableClient files
const files = [
  'src/app/dashboard/timetable/primary/TimetableClient.tsx',
  'src/app/dashboard/timetable/branch/TimetableClient.tsx',
  'src/app/dashboard/timetable/main-secondary/TimetableClient.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file}, does not exist`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Hiding watermark by adding watermark-text class
  if (!content.includes('watermark-text')) {
    content = content.replace(/className="text-\[56px\] font-black leading-none tracking-tighter"/g, 'className="watermark-text text-[56px] font-black leading-none tracking-tighter"');
    content = content.replace(/className="text-\[16px\] font-black uppercase tracking-tight mt-1 whitespace-nowrap"/g, 'className="watermark-text text-[16px] font-black uppercase tracking-tight mt-1 whitespace-nowrap"');
    changed = true;
  }

  // Adding Print button next to Export PNG button
  if (!content.includes('window.print()')) {
    const printButton = `\n                <button
                  onClick={() => window.print()}
                  className="bg-slate-600 hover:bg-slate-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print"
                  style={{ padding: '6px 12px' }}
                  title="In TKB (PDF A4 Đen trắng)"
                >
                  🖨️ In PDF (A4)
                </button>`;
    
    // Tìm button Xuất ảnh và chèn In PDF ngay trước nó
    content = content.replace(
      /(<div className="relative group no-print">)/,
      printButton + '\n                $1'
    );
    // Nếu regex trên không match, thử cách khác:
    if (!content.includes('window.print()')) {
        content = content.replace(
            /(<div className="relative group">[\s\S]*?<button[\s\S]*?onClick=\{\(\) => handleExportPNG)/,
            printButton + '\n                $1'
        );
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}

console.log('All patches applied!');
