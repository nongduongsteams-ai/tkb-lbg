"use client";

import { signOut } from "next-auth/react";
import { Bell, LogOut, User, ChevronDown, Sparkles, Sliders } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function TopBar({ user }: TopBarProps) {
  const [showMenu, setShowMenu] = useState(false);

  const initials = user.name
    ? user.name
        .split(" ")
        .slice(-2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="sticky top-0 z-20 w-full h-16 border-b border-[#e5e7eb] bg-white/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-400">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TKB-LBG</span>
          </div>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-100 font-bold tracking-tight">Overview</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-600 tracking-wider">Neon DB Online</span>
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 rounded-xl text-slate-500 hover:text-[#1a1c23] hover:bg-slate-100 transition-colors group">
            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DFE278] border border-white" />
          </button>

        <div className="w-[1px] h-4 bg-slate-200" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 p-1.5 pr-4 rounded-full border border-[#e5e7eb] bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a1c23] to-[#2d3748] flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[#1a1c23] leading-none group-hover:text-black transition-colors">
                {user.name || "Người dùng"}
              </p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-none">{user.email}</p>
            </div>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", showMenu && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-full bg-white rounded-2xl shadow-2xl border border-[#e5e7eb] z-40 overflow-hidden"
                  style={{ padding: '8px', width: '280px', marginTop: '8px' }}
                >
                  <div 
                    className="border-b border-[#e5e7eb] bg-slate-50/50 rounded-xl mb-2"
                    style={{ padding: '16px' }}
                  >
                    <p className="font-extrabold text-[#1a1c23] truncate" style={{ fontSize: '15px', marginBottom: '4px' }}>{user.name}</p>
                    <p className="font-medium text-slate-500 truncate" style={{ fontSize: '13px' }}>{user.email}</p>
                  </div>

                  <button
                    className="w-full flex items-center gap-3 rounded-xl font-semibold text-slate-600 hover:text-[#1a1c23] hover:bg-slate-100 transition-colors text-left"
                    style={{ padding: '12px 16px', fontSize: '14px' }}
                    onClick={() => setShowMenu(false)}
                  >
                    <User className="w-4.5 h-4.5 text-slate-400" />
                    Hồ sơ cá nhân
                  </button>

                  <button
                    className="w-full flex items-center gap-3 rounded-xl font-semibold text-rose-500 hover:bg-rose-50 transition-colors text-left mt-1"
                    style={{ padding: '12px 16px', fontSize: '14px' }}
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    <LogOut className="w-4.5 h-4.5" />
                    Đăng xuất
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </header>
  );
}
