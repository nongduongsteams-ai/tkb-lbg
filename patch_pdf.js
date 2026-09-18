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

  // Add import jsPDF if not exists
  if (!content.includes('import { jsPDF }')) {
    content = content.replace(/import \{ toPng \} from 'html-to-image';/, "import { toPng } from 'html-to-image';\nimport { jsPDF } from 'jspdf';");
    changed = true;
  }

  // Add handleDownloadPDF function
  if (!content.includes('handleDownloadPDF')) {
    const fn = `
  const handleDownloadPDF = async () => {
    setExportMode('FULL');
    setTimeout(async () => {
      if (!tableRef.current) {
        setExportMode('IDLE');
        return;
      }
      try {
        const dataUrl = await toPng(tableRef.current, {
          backgroundColor: '#ffffff',
          filter: (node) => {
             if (node.classList?.contains('watermark-text')) return false;
             return true;
          }
        });
        
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4"
        });
        
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(\`TKB_Tuan_\${weekNumber}.pdf\`);
      } catch (error) {
        console.error('Lỗi xuất PDF:', error);
        alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
      } finally {
        setExportMode('IDLE');
      }
    }, 150);
  };
`;
    content = content.replace(/(const handleExportPNG = async)/, fn + '\n  $1');
    changed = true;
  }

  // Replace onClick window.print button
  if (content.includes('window.print()')) {
      content = content.replace(
        /onClick=\{\(\) => window\.print\(\)\}[\s\S]*?🖨️ In PDF/,
        'onClick={handleDownloadPDF}\n                className="bg-slate-600 hover:bg-slate-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print mr-2"\n                style={{ padding: \'6px 12px\' }}\n                title="Tải TKB (PDF A4)"\n              >\n                📥 Tải PDF'
      );
      changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
