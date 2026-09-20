const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function checkLogin() {
  const email = "admin@c2nt.edu.vn";
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log("User not found!");
    return;
  }
  
  const isValid = await bcrypt.compare("Admin@123", user.passwordHash);
  console.log("Hash in DB:", user.passwordHash);
  console.log("Is valid:", isValid);
}

checkLogin().finally(() => prisma.$disconnect());
