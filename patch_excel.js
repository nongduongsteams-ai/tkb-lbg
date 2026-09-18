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

  // Replace jsPDF/autoTable imports with xlsx
  content = content.replace(/import \{ jsPDF \} from 'jspdf';\n?/, "");
  content = content.replace(/import autoTable from 'jspdf-autotable';\n?/, "");
  content = content.replace(/import \{ toPng \} from 'html-to-image';\n?/, "import { toPng } from 'html-to-image';\nimport * as XLSX from 'xlsx';\n");
  
  // New handler
  const excelHandler = `
  const handleDownloadExcel = async () => {
    try {
      const table = document.getElementById('tkb-table');
      if (!table) return;
      
      const wb = XLSX.utils.table_to_book(table, { raw: true });
      XLSX.writeFile(wb, \`TKB_Tuan_\${weekNumber}.xlsx\`);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Có lỗi xảy ra khi tạo Excel. Vui lòng thử lại.');
    }
  };
`;

  // Find handleDownloadPDF and replace it
  const match = content.match(/const handleDownloadPDF = async \(\) => \{[\s\S]*?setExportMode\('IDLE'\);\s*\}\s*\};/);
  if (match) {
    content = content.replace(match[0], excelHandler);
    changed = true;
  }

  // Replace button
  if (content.includes('onClick={handleDownloadPDF}')) {
    content = content.replace(
      /onClick=\{handleDownloadPDF\}[\s\S]*?📥 Tải PDF/,
      'onClick={handleDownloadExcel}\n                className="bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print mr-2"\n                style={{ padding: \'6px 12px\' }}\n                title="Tải TKB (Excel)"\n              >\n                📊 Tải Excel'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
