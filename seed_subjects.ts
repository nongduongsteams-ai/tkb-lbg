import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECTS_DATA = [
  { name: "Ngữ văn", color: "#f43f5e" },
  { name: "Toán", color: "#3b82f6" },
  { name: "Ngoại ngữ 1", color: "#10b981" },
  { name: "GDCD", color: "#8b5cf6" },
  { name: "Lịch sử và Địa lí (Lịch sử)", color: "#f59e0b" },
  { name: "Lịch sử và Địa lí (Địa lý)", color: "#b45309" },
  { name: "Khoa học tự nhiên (Lí)", color: "#0ea5e9" },
  { name: "Khoa học tự nhiên (Hoá)", color: "#0284c7" },
  { name: "Khoa học tự nhiên (Sinh)", color: "#14b8a6" },
  { name: "Công nghệ", color: "#64748b" },
  { name: "Tin học", color: "#334155" },
  { name: "GDTC", color: "#ef4444" },
  { name: "Nghệ thuật (Âm nhạc)", color: "#f472b6" },
  { name: "Nghệ thuật (Mĩ thuật)", color: "#be185d" },
  { name: "HĐTN, HN (Chào cờ)", color: "#a3e635" },
  { name: "HĐTN, HN (Sinh hoạt)", color: "#65a30d" },
  { name: "HĐTN, HN (TN CĐ)", color: "#4d7c0f" },
  { name: "GDĐP", color: "#a855f7" }
];

const GRADES = [6, 7, 8, 9];

async function main() {
  console.log("Xóa dữ liệu cũ...");
  await prisma.curriculum.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.subject.deleteMany();

  console.log("Đang tạo danh mục môn học mới theo kế hoạch nhà trường chi tiết...");

  for (const grade of GRADES) {
    for (const subject of SUBJECTS_DATA) {
      await prisma.subject.create({
        data: {
          name: subject.name,
          grade: grade,
          color: subject.color,
        }
      });
    }
  }

  console.log("Seeding hoàn tất!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
