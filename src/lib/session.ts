import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

// Lấy session phía server (Server Components, API routes)
export async function getSession() {
  return await getServerSession(authOptions);
}

// Require auth — redirect về login nếu chưa đăng nhập
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

// Require role cụ thể — redirect nếu không đủ quyền
export async function requireRole(allowedRoles: Role[]) {
  const session = await requireAuth();
  const userRole = (session.user as { role: Role }).role;
  if (!allowedRoles.includes(userRole)) {
    redirect("/dashboard");
  }
  return session;
}

// Check quyền (không redirect, chỉ trả boolean)
export function hasRole(userRole: Role | undefined, allowedRoles: Role[]) {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

// Role helpers
export const isAdmin = (role: Role) => role === Role.ADMIN;
export const isBGH = (role: Role) => role === Role.BGH || role === Role.ADMIN;
export const isGV = (role: Role) => role === Role.GV;

/**
 * Xác định quyền chỉnh sửa Thời khóa biểu.
 * Được phép: ADMIN, BGH, và GV có chức vụ Tổ trưởng chuyên môn.
 * Bị chặn: GV thường (không có chức vụ đặc biệt).
 */
export function canEditTimetable(role: Role | string, permissions: string[] = []): boolean {
  if (role === Role.ADMIN || role === Role.BGH) return true;
  // GV có chức vụ "Tổ trưởng" bất kỳ
  if (permissions.some(p => p.toLowerCase().includes("tổ trưởng"))) return true;
  return false;
}
