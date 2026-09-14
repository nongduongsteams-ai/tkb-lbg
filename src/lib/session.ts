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
