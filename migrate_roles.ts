import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    if (user.permissions.includes("BGH") || user.permissions.includes("HT") || user.permissions.includes("PHT")) {
      const newPerms = user.permissions.filter(p => p !== "BGH" && p !== "HT" && p !== "PHT");
      
      if (user.permissions.includes("HT")) {
        newPerms.push("BGH HT");
      }
      if (user.permissions.includes("PHT")) {
        newPerms.push("BGH PHT");
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: { permissions: newPerms }
      });
      console.log(`Updated ${user.name}`);
    }
  }
  console.log("Migration done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
