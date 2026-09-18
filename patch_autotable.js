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

  // Add import jspdf-autotable if not exists
  if (!content.includes('import autoTable from \'jspdf-autotable\'')) {
    content = content.replace(/import \{ jsPDF \} from 'jspdf';/, "import { jsPDF } from 'jspdf';\nimport autoTable from 'jspdf-autotable';");
    changed = true;
  }

  // Add id="tkb-table" to table
  if (!content.includes('id="tkb-table"')) {
    content = content.replace(/<table className=\{`w-full/, '<table id="tkb-table" className={`w-full');
    changed = true;
  }

  // Replace handleDownloadPDF
  const newHandler = `
  const handleDownloadPDF = async () => {
    setExportMode('FULL');
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4"
      });

      try {
        const fontRes = await fetch('/fonts/Roboto-Regular.ttf');
        const fontBlob = await fontRes.blob();
        const reader = new FileReader();
        reader.readAsDataURL(fontBlob);
        await new Promise((resolve) => {
          reader.onloadend = () => {
             const base64data = reader.result.split(',')[1];
             pdf.addFileToVFS('Roboto-Regular.ttf', base64data);
             pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
             pdf.setFont('Roboto');
             resolve();
          };
        });
      } catch(e) {
        console.error('Lỗi tải font:', e);
      }

      autoTable(pdf, {
        html: '#tkb-table',
        theme: 'plain',
        styles: {
          font: 'Roboto',
          fontSize: 8,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 3,
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        },
        margin: { top: 20, left: 20, right: 20, bottom: 20 },
      });

      pdf.save(\`TKB_Tuan_\${weekNumber}.pdf\`);
    } catch (error) {
      console.error('Lỗi xuất PDF:', error);
      alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
    } finally {
      setExportMode('IDLE');
    }
  };
`;

  // Find the old handleDownloadPDF and replace it
  const match = content.match(/const handleDownloadPDF = async \(\) => \{[\s\S]*?150\);\s*\};\s*/);
  if (match) {
    content = content.replace(match[0], newHandler + '\n');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
