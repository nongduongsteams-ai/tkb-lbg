"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 font-semibold text-xs tracking-wider uppercase">Loading TKB-LBG Pro...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Floating Dual-Dock Sidebar (Untitled UI Style) */}
      <Sidebar 
        userRole={session.user.role as string}
        userPermissions={(session.user as any).permissions || []}
        userName={session.user.name ?? undefined}
        userEmail={session.user.email ?? undefined}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div 
        className="flex flex-col min-h-screen min-w-0 transition-all duration-300"
        style={{ marginLeft: isSidebarCollapsed ? '96px' : '266px' }} // 80px/250px + 16px gap
      >
        <TopBar user={session.user} />
        <main className="flex-1 p-8 pr-10">{children}</main>
      </div>
    </div>
  );
}
