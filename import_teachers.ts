import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const mdPath = "D:/GOOGLE DRIVER NVD/Project AI 2026/TKB-LBG/DANH SÁCH GIÁO VIÊN PHÂN CÔNG.md";
  const content = fs.readFileSync(mdPath, "utf-8");
  
  const lines = content.split('\n');
  const teachers = [];
  
  for (const line of lines) {
    if (!line.startsWith('|') || line.includes('| TT |') || line.includes('|---|')) {
      continue;
    }
    
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 5) continue;
    
    let rawName = parts[2];
    if (!rawName) continue;
    
    // Clean name "Ông Mai Tuấn Khương" -> "Mai Tuấn Khương"
    let name = rawName.replace(/^(Ông|Bà)\s+/, "");
    
    const dobString = parts[3];
    const chucVu = parts[4]; // HT, PHT, GV, TPCM TN, NV, TTCM XH
    const phanCong = parts[5] ? parts[5].trim() : "";
    
    let role = "GV";
    let permissions: string[] = [];
    
    if (chucVu === "HT") {
      role = "BGH";
      permissions.push("BGH HT");
    } else if (chucVu === "PHT") {
      role = "BGH";
      permissions.push("BGH PHT");
    } else if (chucVu === "TPCM TN" || chucVu === "TTCM XH") {
      role = "GV";
      permissions.push(chucVu === "TPCM TN" ? "Tổ phó KHTN" : "Tổ trưởng KHXH");
    } else if (chucVu === "NV") {
      role = "GV"; // No NV role in db
      permissions.push("Nhân viên");
    }

    if (phanCong && phanCong.length > 0) {
      // Nếu có thông tin phân công giảng dạy (dù là BGH hay GV) thì đều có quyền GVBM
      permissions.push("GVBM");
    }
    
    // Parse DOB if possible
    let dob: Date | null = null;
    if (dobString && dobString.trim() !== "") {
      const parts = dobString.split('/');
      if (parts.length === 3) {
        dob = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00Z`);
      }
    }
    
    let shortName = name.split(' ').pop(); // Lấy tên cuối
    
    // Generate email
    const email = `teacher${parts[1]}@truong.edu.vn`;
    
    teachers.push({
      name,
      email,
      passwordHash: await bcrypt.hash("123456", 10),
      dob,
      role: role as any,
      shortName,
      permissions
    });
  }
  
  console.log(`Đã đọc ${teachers.length} giáo viên. Bắt đầu import...`);
  
  for (const t of teachers) {
    const existing = await prisma.user.findFirst({
      where: { name: t.name }
    });
    
    if (!existing) {
      await prisma.user.create({
        data: t
      });
      console.log(`+ Thêm mới: ${t.name}`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: t.role,
          dob: t.dob,
          shortName: t.shortName,
          permissions: t.permissions
        }
      });
      console.log(`* Cập nhật: ${t.name}`);
    }
  }
  
  console.log("Xong!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
