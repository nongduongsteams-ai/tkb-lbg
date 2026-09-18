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

  // Replace import * as XLSX
  content = content.replace(/import \* as XLSX from 'xlsx';\n?/, "");

  const excelHandler = `
  const handleDownloadExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ThoiKhoaBieu');

      // 1. Header
      const headers = ['Thứ', 'Buổi', 'Tiết'];
      classes.forEach((c: any) => {
         headers.push(c.name);
         headers.push('ĐC');
      });
      headers.push('Ghi chú');
      
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell((cell: any) => {
         cell.font = { bold: true };
         cell.alignment = { vertical: 'middle', horizontal: 'center' };
         cell.border = {
           top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
         };
      });

      let currentRowNum = 2;

      days.forEach(day => {
        const dayName = day === 8 ? 'Chủ Nhật' : (day === 2 ? 'Hai' : (day === 3 ? 'Ba' : (day === 4 ? 'Tư' : (day === 5 ? 'Năm' : (day === 6 ? 'Sáu' : (day === 7 ? 'Bảy' : ''))))));
        
        const getVisiblePeriods = (sessionStr: string) => {
           const currentPeriods = (sessionStr === 'SANG' && showPeriod5) ? [1, 2, 3, 4, 5] : periods;
           if (!hideEmptyRows) return currentPeriods;
           let vPeriods = currentPeriods.filter(p => !classes.every((cls: any) => !getSlot(day, p, sessionStr, cls.id, 'NORMAL') && !getSlot(day, p, sessionStr, cls.id, 'SUBSTITUTE')));
           if (vPeriods.length === 0 && sessionStr === 'CHIEU') {
             const note = timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === sessionStr)?.content || '';
             if (note.trim().length > 0) vPeriods = [1];
           }
           return vPeriods;
        };

        const visibleSessions = sessions.filter(s => getVisiblePeriods(s).length > 0);
        if (visibleSessions.length === 0) return;

        let dayStartRow = currentRowNum;

        visibleSessions.forEach(session => {
           const visiblePeriods = getVisiblePeriods(session);
           let sessionStartRow = currentRowNum;

           visiblePeriods.forEach((period, pIdx) => {
             const rowData: any[] = [];
             rowData.push(dayName);
             rowData.push(session === 'SANG' ? 'Sáng' : 'Chiều');
             rowData.push(\`Tiết \${period}\`);

             classes.forEach((cls: any) => {
                const normalSlot = getSlot(day, period, session, cls.id, 'NORMAL');
                const subSlot = getSlot(day, period, session, cls.id, 'SUBSTITUTE');
                const activeSlot = subSlot || normalSlot;
                
                if (activeSlot) {
                   const subjectName = formatSubjectName(activeSlot.assignment.subject.name);
                   const teacherName = activeSlot.assignment.teacher.shortName || activeSlot.assignment.teacher.name;
                   rowData.push(\`\${subjectName}\\n\${teacherName}\`);
                } else {
                   rowData.push('');
                }
                rowData.push(''); 
             });

             if (pIdx === 0) {
               const note = timetableNotes?.find((n: any) => n.dayOfWeek === day && n.session === session)?.content || '';
               rowData.push(note);
             } else {
               rowData.push('');
             }

             const row = worksheet.addRow(rowData);
             row.height = 35; // set a fixed height for wrapping text
             row.eachCell((cell: any) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                  top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
             });
             currentRowNum++;
           });

           if (currentRowNum - 1 > sessionStartRow) {
             worksheet.mergeCells(sessionStartRow, 2, currentRowNum - 1, 2);
             worksheet.mergeCells(sessionStartRow, headers.length, currentRowNum - 1, headers.length);
           }
        });

        if (currentRowNum - 1 > dayStartRow) {
           worksheet.mergeCells(dayStartRow, 1, currentRowNum - 1, 1);
        }
      });

      worksheet.getColumn(1).width = 10;
      worksheet.getColumn(2).width = 10;
      worksheet.getColumn(3).width = 10;
      for (let i = 4; i < headers.length; i += 2) {
         worksheet.getColumn(i).width = 16;
         worksheet.getColumn(i+1).width = 5;
      }
      worksheet.getColumn(headers.length).width = 20;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = \`TKB_Tuan_\${weekNumber}.xlsx\`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Có lỗi xảy ra khi tạo Excel. Vui lòng thử lại.');
    }
  };
`;

  const match = content.match(/const handleDownloadExcel = async \(\) => \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n  \};\s*/);
  if (match) {
    content = content.replace(match[0], excelHandler);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
