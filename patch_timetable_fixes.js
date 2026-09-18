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

  // 1. Import syncAllWeekPPCT
  if (!content.includes('syncAllWeekPPCT')) {
    content = content.replace(
      /import \{ saveTimetableSlot, deleteTimetableSlot, rolloverWeek, bulkDeleteSlots, BulkDeleteMode, saveTimetableNote, importTimetableFromJSON \} from '@\/actions\/timetable';/,
      "import { saveTimetableSlot, deleteTimetableSlot, rolloverWeek, bulkDeleteSlots, BulkDeleteMode, saveTimetableNote, importTimetableFromJSON, syncAllWeekPPCT } from '@/actions/timetable';"
    );
    changed = true;
  }

  // 2. Add isSyncing state
  if (!content.includes('const [isSyncing, setIsSyncing] = useState(false);')) {
    content = content.replace(
      'const [isImporting, setIsImporting] = useState(false);',
      'const [isImporting, setIsImporting] = useState(false);\n  const [isSyncing, setIsSyncing] = useState(false);'
    );
    changed = true;
  }

  // 3. Add handleSyncPPCT
  const handleSyncCode = `
  const handleSyncPPCT = async () => {
    if (!confirm('Bạn có chắc muốn rà soát và đồng bộ lại toàn bộ PPCT cho tuần ' + weekNumber + '? (Quá trình này có thể mất vài giây)')) return;
    setIsSyncing(true);
    try {
      const classIds = classes.map((c: any) => c.id);
      const res = await syncAllWeekPPCT(weekNumber, schoolYear, classIds);
      if (res.success) {
        alert('Đồng bộ PPCT thành công!');
        // Giao diện sẽ tự động revalidatePath nên data mới sẽ về
      } else {
        alert('Lỗi: ' + res.error);
      }
    } catch (e: any) {
      alert('Lỗi kết nối');
    } finally {
      setIsSyncing(false);
    }
  };
`;
  if (!content.includes('const handleSyncPPCT = async () => {')) {
    content = content.replace(
      /const handleDownloadExcel = async \(\) => \{/,
      handleSyncCode + '\n  const handleDownloadExcel = async () => {'
    );
    changed = true;
  }

  // 4. Add button
  if (!content.includes('onClick={handleSyncPPCT}')) {
    content = content.replace(
      /<button\s+onClick=\{handleDownloadExcel\}/,
      `<button 
                onClick={handleSyncPPCT}
                disabled={isSyncing}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors flex items-center gap-1 no-print mr-2"
                style={{ padding: '6px 12px' }}
                title="Đồng bộ lại tên bài PPCT cho tuần này"
              >
                {isSyncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ PPCT'}
              </button>
              <button 
                onClick={handleDownloadExcel}`
    );
    changed = true;
  }

  // 5. Fix recalculateLocalPPCT
  const recalcRegex = /let currentLessonNum = 1;[\s\S]*?const updatedSlotMap = new Map<string, \{ actualLessonNum: number; autoLessonNum: number \}>\(\);/;
  if (content.match(recalcRegex)) {
    const newRecalc = `
    const existingNums = targetSlots
      .map((s: any) => s.teachingSchedules?.[0]?.actualLessonNum || periodNumMap.get(s.id))
      .filter((n: any) => n != null);
    let currentLessonNum = existingNums.length > 0 ? Math.min(...existingNums) : 1;
    const updatedSlotMap = new Map<string, { actualLessonNum: number; autoLessonNum: number }>();`;
    
    content = content.replace(recalcRegex, newRecalc);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
  }
}
