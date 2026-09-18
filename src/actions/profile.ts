"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// ─── Đổi mật khẩu (tự bản thân) ─────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Không tìm thấy người dùng" };

    // Verify mật khẩu cũ
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return { success: false, error: "Mật khẩu hiện tại không đúng" };
    }

    if (newPassword.length < 4) {
      return { success: false, error: "Mật khẩu mới phải có ít nhất 4 ký tự" };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Lỗi đổi mật khẩu:", error);
    return { success: false, error: error.message };
  }
}

// ─── Lấy thông tin profile của user hiện tại ─────────────────────────────

export async function getMyProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" };

    const userId = (session.user as { id: string }).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        shortName: true,
        permissions: true,
        branch: true,
        createdAt: true,
      },
    });

    if (!user) return { success: false, error: "Không tìm thấy người dùng" };
    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
