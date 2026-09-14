import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (["Mai Tuấn Khương", "Nguyễn Thị Minh", "Hoàng Liên Sơn"].includes(u.name)) {
      console.log(u.name, u.permissions);
    }
  }
}
check().finally(() => prisma.$disconnect());
