import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ═══════════════════════════════════════
  // 1. TẠO TÀI KHOẢN MẶC ĐỊNH
  // ═══════════════════════════════════════
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const bghPassword = await bcrypt.hash("BGH@123", 12);
  const gvPassword = await bcrypt.hash("GV@123", 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@c2nt.edu.vn" },
    update: {},
    create: {
      name: "Quản trị viên",
      email: "admin@c2nt.edu.vn",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      gender: "NAM",
    },
  });

  // BGH
  const bgh = await prisma.user.upsert({
    where: { email: "hieupho@c2nt.edu.vn" },
    update: {},
    create: {
      name: "Nguyễn Thị Hiệu Phó",
      email: "hieupho@c2nt.edu.vn",
      passwordHash: bghPassword,
      role: Role.BGH,
      gender: "NU",
    },
  });

  // GV mẫu từ file phân công
  const gvDuong = await prisma.user.upsert({
    where: { email: "duong@c2nt.edu.vn" },
    update: {},
    create: {
      name: "Nông Văn Dưỡng",
      email: "duong@c2nt.edu.vn",
      passwordHash: gvPassword,
      role: Role.GV,
      gender: "NAM",
    },
  });

  console.log(`✅ Created users: ${admin.name}, ${bgh.name}, ${gvDuong.name}`);

  // ═══════════════════════════════════════
  // 2. KHUNG KẾ HOẠCH GIÁO DỤC 2026-2027
  //    Dữ liệu từ file KHGD PDF
  // ═══════════════════════════════════════
  const schoolPlans = [
    // Khối 6 - áp dụng tương tự cho 7,8,9
    { subjectName: "Ngữ văn",        periodsPerWeekHk1: 4, periodsPerWeekHk2: 4, totalHk1: 72, totalHk2: 68, totalYear: 140 },
    { subjectName: "Toán",           periodsPerWeekHk1: 4, periodsPerWeekHk2: 4, totalHk1: 72, totalHk2: 68, totalYear: 140 },
    { subjectName: "KHTN",           periodsPerWeekHk1: 4, periodsPerWeekHk2: 4, totalHk1: 72, totalHk2: 68, totalYear: 140 },
    { subjectName: "Lịch sử & Địa lí", periodsPerWeekHk1: 3, periodsPerWeekHk2: 3, totalHk1: 54, totalHk2: 51, totalYear: 105 },
    { subjectName: "Tin học",        periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
    { subjectName: "Tiếng Anh",      periodsPerWeekHk1: 3, periodsPerWeekHk2: 3, totalHk1: 54, totalHk2: 51, totalYear: 105 },
    { subjectName: "HĐTN, HN",       periodsPerWeekHk1: 3, periodsPerWeekHk2: 3, totalHk1: 54, totalHk2: 51, totalYear: 105 },
    { subjectName: "Thể dục",        periodsPerWeekHk1: 2, periodsPerWeekHk2: 2, totalHk1: 36, totalHk2: 34, totalYear: 70 },
    { subjectName: "Công nghệ",      periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
    { subjectName: "Âm nhạc",        periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
    { subjectName: "Mỹ thuật",       periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
    { subjectName: "GDCD",           periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
    { subjectName: "GDQPAN",         periodsPerWeekHk1: 1, periodsPerWeekHk2: 1, totalHk1: 18, totalHk2: 17, totalYear: 35 },
  ];

  for (const grade of [6, 7, 8, 9]) {
    for (const plan of schoolPlans) {
      await prisma.schoolPlan.upsert({
        where: {
          schoolYear_grade_subjectName: {
            schoolYear: "2026-2027",
            grade,
            subjectName: plan.subjectName,
          },
        },
        update: {},
        create: {
          schoolYear: "2026-2027",
          grade,
          ...plan,
        },
      });
    }
  }
  console.log("✅ Created school plans for grades 6-9");

  // ═══════════════════════════════════════
  // 3. MÔN HỌC (kể cả môn tích hợp)
  // ═══════════════════════════════════════
  for (const grade of [6, 7, 8, 9]) {
    // Môn KHTN (môn gốc)
    const khtn = await prisma.subject.upsert({
      where: { name_grade: { name: "KHTN", grade } },
      update: {},
      create: { name: "KHTN", grade, color: "#10b981" },
    });

    // Phân môn KHTN
    for (const [sub, color] of [["KHTN - Vật lí", "#60a5fa"], ["KHTN - Hóa học", "#f59e0b"], ["KHTN - Sinh học", "#34d399"]]) {
      await prisma.subject.upsert({
        where: { name_grade: { name: sub, grade } },
        update: {},
        create: { name: sub, grade, color, parentSubjectId: khtn.id },
      });
    }

    // Môn LS&ĐL (môn gốc)
    const lsdl = await prisma.subject.upsert({
      where: { name_grade: { name: "Lịch sử & Địa lí", grade } },
      update: {},
      create: { name: "Lịch sử & Địa lí", grade, color: "#a78bfa" },
    });

    // Phân môn LS&ĐL
    for (const [sub, color] of [["Lịch sử", "#c084fc"], ["Địa lí", "#818cf8"]]) {
      await prisma.subject.upsert({
        where: { name_grade: { name: sub, grade } },
        update: {},
        create: { name: sub, grade, color, parentSubjectId: lsdl.id },
      });
    }

    // HĐTN (môn gốc)
    const hdtn = await prisma.subject.upsert({
      where: { name_grade: { name: "HĐTN, HN", grade } },
      update: {},
      create: { name: "HĐTN, HN", grade, color: "#fb923c" },
    });

    // Phân môn HĐTN
    for (const [sub, color] of [["HĐTN - Chào cờ", "#fbbf24"], ["HĐTN - Sinh hoạt lớp", "#f97316"], ["HĐTN - Chủ đề", "#ef4444"]]) {
      await prisma.subject.upsert({
        where: { name_grade: { name: sub, grade } },
        update: {},
        create: { name: sub, grade, color, parentSubjectId: hdtn.id },
      });
    }

    // Các môn độc lập
    const independentSubjects = [
      ["Ngữ văn", "#6366f1"],
      ["Toán", "#3b82f6"],
      ["Tin học", "#06b6d4"],
      ["Tiếng Anh", "#8b5cf6"],
      ["Thể dục", "#22c55e"],
      ["Công nghệ", "#f59e0b"],
      ["Âm nhạc", "#ec4899"],
      ["Mỹ thuật", "#d946ef"],
      ["GDCD", "#64748b"],
      ["GDQPAN", "#78716c"],
    ];

    for (const [name, color] of independentSubjects) {
      await prisma.subject.upsert({
        where: { name_grade: { name, grade } },
        update: {},
        create: { name, grade, color },
      });
    }
  }
  console.log("✅ Created subjects for grades 6-9 (including integrated subjects)");

  // ═══════════════════════════════════════
  // 4. LỚP HỌC MẪU
  // ═══════════════════════════════════════
  const classes = [
    { name: "6A", grade: 6 },
    { name: "6B", grade: 6 },
    { name: "7A", grade: 7 },
    { name: "7B", grade: 7 },
    { name: "8A", grade: 8 },
    { name: "8B", grade: 8 },
    { name: "9", grade: 9 },
  ];

  for (const cls of classes) {
    await prisma.class.upsert({
      where: { name_schoolYear: { name: cls.name, schoolYear: "2026-2027" } },
      update: {},
      create: { ...cls, schoolYear: "2026-2027" },
    });
  }
  console.log("✅ Created classes: 6A, 6B, 7A, 7B, 8A, 8B, 9");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Tài khoản mặc định:");
  console.log("   Admin:  admin@c2nt.edu.vn / Admin@123");
  console.log("   BGH:    hieupho@c2nt.edu.vn / BGH@123");
  console.log("   GV:     duong@c2nt.edu.vn / GV@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
