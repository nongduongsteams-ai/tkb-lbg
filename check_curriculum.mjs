const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function main() {
  const count = await p.curriculum.count({ where: { grade: 8 } });
  console.log('Tong so tiet PPCT khoi 8:', count);
  
  // Lay 20 tiet dau cua Tin hoc khoi 8
  const tinRows = await p.curriculum.findMany({
    where: { grade: 8, subject: { name: { contains: 'Tin' } } },
    include: { subject: { select: { name: true } } },
    orderBy: [{ lessonNumber: 'asc' }],
    take: 10
  });

  if (tinRows.length === 0) {
    console.log('KHONG CO PPCT Tin hoc khoi 8!');
  } else {
    console.log('\n--- PPCT Tin hoc grade 8 ---');
    tinRows.forEach(r => {
      console.log('  Tiet', r.lessonNumber, ':', r.lessonName);
    });
  }
  
  // Check tong so tiet cua tat ca mon
  const allSubjects = await p.curriculum.groupBy({
    by: ['grade'],
    _count: true,
    orderBy: { grade: 'asc' }
  });
  console.log('\n--- So luong PPCT theo khoi ---');
  allSubjects.forEach(s => console.log('  Khoi', s.grade, ':', s._count, 'tiet'));
}

main().then(() => p.$disconnect()).catch(e => { console.error(e.message); p.$disconnect(); });
