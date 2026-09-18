"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Tạo username từ tên GV: "Nguyễn Văn An" → "nguyenvanan" */
function generateUsername(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join("");
  return normalized;
}

/** Tạo email đăng nhập: username@tkb.local */
function generateEmail(name: string): string {
  return `${generateUsername(name)}@tkb.local`;
}

/** Mật khẩu mặc định đơn giản: "gv" + 6 số cuối của timestamp */
function generateDefaultPassword(): string {
  return `gv${Date.now().toString().slice(-6)}`;
}

// ─── Lấy danh sách giáo viên ─────────────────────────────────────────────

export async function getTeachers() {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: {
          in: ["GV", "BGH"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: teachers };
  } catch (error: any) {
    console.error("Lỗi lấy danh sách giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// ─── Thêm mới giáo viên ────────────────────────────────────────────────────

export async function createTeacher(data: {
  name: string;
  shortName: string;
  permissions: string[];
  email?: string;
  password?: string;
}) {
  try {
    // Tạo email tự động nếu không cung cấp
    const email = data.email?.trim() || generateEmail(data.name);

    // Tạo mật khẩu mặc định nếu không cung cấp
    const rawPassword = data.password?.trim() || generateDefaultPassword();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const newTeacher = await prisma.user.create({
      data: {
        name: data.name,
        shortName: data.shortName,
        permissions: data.permissions,
        email,
        passwordHash,
        role: "GV",
      },
    });

    revalidatePath("/dashboard/teachers");
    return {
      success: true,
      data: newTeacher,
      // Trả về thông tin tài khoản để Admin biết
      accountInfo: {
        email,
        password: rawPassword,
      },
    };
  } catch (error: any) {
    console.error("Lỗi thêm giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// ─── Cập nhật giáo viên ────────────────────────────────────────────────────

export async function updateTeacher(
  id: string,
  data: {
    name: string;
    shortName: string;
    permissions: string[];
    email?: string;
    password?: string; // Nếu có → đổi mật khẩu
  }
) {
  try {
    const updateData: any = {
      name: data.name,
      shortName: data.shortName,
      permissions: data.permissions,
    };

    if (data.email?.trim()) updateData.email = data.email.trim();
    if (data.password?.trim()) {
      updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
    }

    const updatedTeacher = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/teachers");
    return { success: true, data: updatedTeacher };
  } catch (error: any) {
    console.error("Lỗi cập nhật giáo viên:", error);
    return { success: false, error: error.message };
  }
}

// ─── Reset mật khẩu (Admin) ───────────────────────────────────────────────

export async function resetTeacherPassword(id: string) {
  try {
    const teacher = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    if (!teacher) return { success: false, error: "Không tìm thấy giáo viên" };

    const newPassword = generateDefaultPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    revalidatePath("/dashboard/teachers");
    return { success: true, newPassword };
  } catch (error: any) {
    console.error("Lỗi reset mật khẩu:", error);
    return { success: false, error: error.message };
  }
}

// ─── Tạo tài khoản hàng loạt cho các GV chưa có mật khẩu ─────────────────

export async function bulkSetupTeacherAccounts() {
  try {
    // Tìm GV có passwordHash là dummy cũ
    const teachers = await prisma.user.findMany({
      where: { passwordHash: "default_password_hash" },
      select: { id: true, name: true, email: true },
    });

    const results = [];
    for (const t of teachers) {
      const rawPassword = generateDefaultPassword();
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      // Cũng cập nhật email nếu đang là email ảo cũ (dạng gv_timestamp@...)
      const emailNeedsUpdate = t.email.startsWith("gv_") && t.email.endsWith("@school.edu.vn");
      const newEmail = emailNeedsUpdate ? generateEmail(t.name) : t.email;

      await prisma.user.update({
        where: { id: t.id },
        data: {
          passwordHash,
          ...(emailNeedsUpdate ? { email: newEmail } : {}),
        },
      });

      results.push({ id: t.id, name: t.name, email: newEmail, password: rawPassword });
    }

    revalidatePath("/dashboard/teachers");
    return { success: true, data: results };
  } catch (error: any) {
    console.error("Lỗi setup tài khoản hàng loạt:", error);
    return { success: false, error: error.message };
  }
}

// ─── Xóa giáo viên ────────────────────────────────────────────────────────

export async function deleteTeacher(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/dashboard/teachers");
    return { success: true };
  } catch (error: any) {
    console.error("Lỗi xóa giáo viên:", error);
    return { success: false, error: error.message };
  }
}
