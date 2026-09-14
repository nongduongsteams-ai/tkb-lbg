/**
 * migrate_to_supabase.ts
 * Script migrate toàn bộ data từ Neon → Supabase
 * Chạy: npx tsx migrate_to_supabase.ts
 */

import { PrismaClient } from "@prisma/client";

// ─── CẤU HÌNH ───────────────────────────────────────────
// Điền Supabase Direct URL vào đây trước khi chạy
const SUPABASE_DIRECT_URL = process.env.SUPABASE_DIRECT_URL || "";
// ────────────────────────────────────────────────────────

const NEON_URL =
  "postgresql://neondb_owner:npg_humC0BFf1cMT@ep-patient-bar-b39vujmi.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

if (!SUPABASE_DIRECT_URL) {
  console.error(
    "❌ Chưa điền SUPABASE_DIRECT_URL. Chạy: SUPABASE_DIRECT_URL=... npx tsx migrate_to_supabase.ts"
  );
  process.exit(1);
}

const src = new PrismaClient({ datasources: { db: { url: NEON_URL } } });
const dst = new PrismaClient({
  datasources: { db: { url: SUPABASE_DIRECT_URL } },
});

async function migrate() {
  console.log("🚀 Bắt đầu migrate data Neon → Supabase...\n");

  try {
    // ─── 1. USERS ───────────────────────────────────────
    console.log("📦 [1/9] Đang migrate Users...");
    const users = await src.user.findMany();
    if (users.length > 0) {
      await dst.user.deleteMany();
      await dst.user.createMany({ data: users, skipDuplicates: true });
    }
    console.log(`   ✅ ${users.length} users`);

    // ─── 2. SESSIONS ────────────────────────────────────
    console.log("📦 [2/9] Đang migrate Sessions...");
    const sessions = await src.session.findMany();
    if (sessions.length > 0) {
      await dst.session.deleteMany();
      await dst.session.createMany({ data: sessions, skipDuplicates: true });
    }
    console.log(`   ✅ ${sessions.length} sessions`);

    // ─── 3. SCHOOL PLANS ────────────────────────────────
    console.log("📦 [3/9] Đang migrate SchoolPlans...");
    const schoolPlans = await src.schoolPlan.findMany();
    if (schoolPlans.length > 0) {
      await dst.schoolPlan.deleteMany();
      await dst.schoolPlan.createMany({ data: schoolPlans, skipDuplicates: true });
    }
    console.log(`   ✅ ${schoolPlans.length} school plans`);

    // ─── 4. WEEKLY SCHOOL PLANS ─────────────────────────
    console.log("📦 [4/9] Đang migrate WeeklySchoolPlans...");
    const weeklyPlans = await src.weeklySchoolPlan.findMany();
    if (weeklyPlans.length > 0) {
      await dst.weeklySchoolPlan.deleteMany();
      await dst.weeklySchoolPlan.createMany({ data: weeklyPlans, skipDuplicates: true });
    }
    console.log(`   ✅ ${weeklyPlans.length} weekly school plans`);

    // ─── 5. SUBJECTS ────────────────────────────────────
    console.log("📦 [5/9] Đang migrate Subjects...");
    const subjects = await src.subject.findMany({
      orderBy: { parentSubjectId: "asc" },
    });
    await dst.subject.deleteMany();
    for (const s of subjects) {
      await dst.subject.create({ data: s });
    }
    console.log(`   ✅ ${subjects.length} subjects`);

    // ─── 6. CLASSES ─────────────────────────────────────
    console.log("📦 [6/9] Đang migrate Classes...");
    const classes = await src.class.findMany();
    if (classes.length > 0) {
      await dst.class.deleteMany();
      await dst.class.createMany({ data: classes, skipDuplicates: true });
    }
    console.log(`   ✅ ${classes.length} classes`);

    // ─── 7. CURRICULUM (PPCT) ───────────────────────────
    console.log("📦 [7/9] Đang migrate Curriculums (PPCT)...");
    const curriculums = await src.curriculum.findMany();
    if (curriculums.length > 0) {
      await dst.curriculum.deleteMany();
      await dst.curriculum.createMany({ data: curriculums, skipDuplicates: true });
    }
    console.log(`   ✅ ${curriculums.length} curriculum entries`);

    // ─── 8. ASSIGNMENTS ─────────────────────────────────
    console.log("📦 [8/9] Đang migrate Assignments...");
    const assignments = await src.assignment.findMany();
    if (assignments.length > 0) {
      await dst.assignment.deleteMany();
      await dst.assignment.createMany({ data: assignments, skipDuplicates: true });
    }
    console.log(`   ✅ ${assignments.length} assignments`);

    // ─── 9. TIMETABLE SLOTS + TEACHING SCHEDULES ────────
    console.log("📦 [9/9] Đang migrate TimetableSlots & TeachingSchedules...");
    const slots = await src.timetableSlot.findMany({
      include: { teachingSchedules: true },
    });

    await dst.teachingSchedule.deleteMany();
    await dst.timetableSlot.deleteMany();

    let slotCount = 0;
    let scheduleCount = 0;
    for (const slot of slots) {
      const { teachingSchedules, ...slotData } = slot;
      await dst.timetableSlot.create({ data: slotData });
      if (teachingSchedules.length > 0) {
        await dst.teachingSchedule.createMany({ data: teachingSchedules, skipDuplicates: true });
        scheduleCount += teachingSchedules.length;
      }
      slotCount++;
    }
    console.log(`   ✅ ${slotCount} timetable slots, ${scheduleCount} teaching schedules`);

    console.log("\n🎉 Migration hoàn thành thành công!");
    console.log("─".repeat(50));
    console.log(`  Users:              ${users.length}`);
    console.log(`  School plans:       ${schoolPlans.length}`);
    console.log(`  Weekly plans:       ${weeklyPlans.length}`);
    console.log(`  Subjects:           ${subjects.length}`);
    console.log(`  Classes:            ${classes.length}`);
    console.log(`  Curriculums:        ${curriculums.length}`);
    console.log(`  Assignments:        ${assignments.length}`);
    console.log(`  Timetable slots:    ${slotCount}`);
    console.log(`  Teaching schedules: ${scheduleCount}`);
  } catch (err) {
    console.error("\n❌ Lỗi khi migrate:", err);
    throw err;
  } finally {
    await src.$disconnect();
    await dst.$disconnect();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
