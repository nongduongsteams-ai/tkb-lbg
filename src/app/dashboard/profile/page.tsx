import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân | TKB Pro",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

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

  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        ...user,
        role: user.role as string,
        createdAt: user.createdAt,
      }}
    />
  );
}
