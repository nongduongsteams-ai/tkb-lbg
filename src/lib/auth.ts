import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions, // ← thêm permissions vào token
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Luôn cập nhật quyền mới nhất từ DB để tránh lỗi session cũ
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, permissions: true }
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.permissions = dbUser.permissions;
          }
        } catch (error) {
          console.error("JWT fetch DB error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as { id: string; role: Role; permissions: string[] };
        u.role = token.role as Role;
        u.id = token.id as string;
        u.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
