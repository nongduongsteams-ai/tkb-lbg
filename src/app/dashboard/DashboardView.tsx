"use client";

import {
  Users,
  BookOpen,
  Calendar,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardViewProps {
  user: { name?: string | null; role: string };
  stats: {
    userCount: number;
    classCount: number;
    subjectCount: number;
  };
}

export default function DashboardView({ user, stats }: DashboardViewProps) {
  const statCards = [
    {
      label: "Giáo viên nhà trường",
      value: stats.userCount,
      unit: "Giáo viên",
      icon: Users,
      badge: "+3 GV mới",
      glowColor: "glow-indigo",
      iconBg: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
    },
    {
      label: "Lớp học 2026-2027",
      value: stats.classCount,
      unit: "Lớp học",
      icon: BookOpen,
      badge: "Các khối lớp",
      glowColor: "glow-cyan",
      iconBg: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    },
    {
      label: "Môn học & PPCT",
      value: stats.subjectCount,
      unit: "Danh mục môn",
      icon: Layers,
      badge: "Đơn & Tích hợp",
      glowColor: "glow-purple",
      iconBg: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    },
    {
      label: "Tiến độ Xếp TKB",
      value: "Tuần 1",
      unit: "Học kỳ I",
      icon: Calendar,
      badge: "Đang khởi tạo",
      glowColor: "glow-emerald",
      iconBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
  ];

  const firstName = user.name?.split(" ").slice(-1)[0] ?? "bạn";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div className="space-y-8 pb-12">
      {/* World-Class Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white border border-[#e5e7eb] rounded-3xl relative overflow-hidden group shadow-sm"
        style={{ padding: '32px' }}
      >
        {/* Glow ambient circle */}
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl -z-0 pointer-events-none group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Hệ thống Xếp Thời Khóa Biểu Thông Minh
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1a1c23]">
              Xin chào, {user.name || firstName} 👋
            </h1>

            <p className="text-slate-500 text-sm leading-relaxed font-normal">
              Chào mừng bạn đến với hệ thống TKB-LBG Pro thế hệ mới. Đã kết nối cơ sở dữ liệu PostgreSQL 
              dành cho năm học 2025 - 2026.
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <a
              href="/dashboard/timetable"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200 flex items-center gap-2.5 text-[15px] border border-indigo-400/30 group"
            >
              <Zap className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition-transform" />
              Bắt đầu Xếp TKB AI <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* 4 Metric Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="bg-white border border-[#e5e7eb] rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              style={{ padding: '24px' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500">{stat.label}</span>
                <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                  <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mt-2 pt-1 pb-2">
                <span className="text-4xl font-extrabold text-[#1a1c23] tracking-tight leading-tight">{stat.value}</span>
                <span className="text-sm font-medium text-slate-500">{stat.unit}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">{stat.badge}</span>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Hoạt động
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Main 2-Column Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left 2-Column: Functional Menus */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white border border-[#e5e7eb] rounded-3xl shadow-sm" style={{ padding: '28px' }}>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#1a1c23] flex items-center gap-2 tracking-tight">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500 stroke-[2.2]" />
                Các Menu Nghiệp vụ Cốt lõi
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Lộ trình triển khai khởi tạo dữ liệu trường học</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
              6 Phân hệ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "1. Kế hoạch nhà trường",
                desc: "Cấu hình định mức số tiết học cho từng môn và từng khối",
                href: "/dashboard/school-plan",
                tag: "Menu 1",
              },
              {
                title: "2. Quản lý Giáo viên",
                desc: "Thêm/sửa GV, phân tổ chuyên môn & import Excel",
                href: "/dashboard/users",
                tag: "Menu 2",
              },
              {
                title: "3. Môn học & PPCT",
                desc: "Cây tích hợp môn KHTN, LS-ĐL & upload file PPCT",
                href: "/dashboard/subjects",
                tag: "Menu 3",
              },
              {
                title: "4. Quản lý Lớp học",
                desc: "Thiết lập danh sách các lớp & phân công GVCN",
                href: "/dashboard/classes",
                tag: "Menu 4",
              },
              {
                title: "5. Phân công Chuyên môn",
                desc: "Marker Smart Importer tự đọc file phân công dạy",
                href: "/dashboard/assignments",
                tag: "Menu 5 (AI)",
              },
              {
                title: "6. Thuật toán Xếp TKB",
                desc: "Tự động xếp lịch không trùng tiết, tối ưu giáo viên",
                href: "/dashboard/timetable",
                tag: "Menu 6",
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 block space-y-3 relative overflow-hidden"
                style={{ padding: '24px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-1 rounded">
                    {item.tag}
                  </span>
                  <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-[#1a1c23] group-hover:text-indigo-600 transition-colors mt-2">
                  {item.title}
                </h3>
                <p className="text-xs font-normal text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </a>
            ))}
          </div>
        </motion.div>

        {/* Right Column: Setup Progress */}
        <motion.div variants={itemVariants} className="bg-white border border-[#e5e7eb] rounded-3xl space-y-6 shadow-sm" style={{ padding: '28px' }}>
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1a1c23] tracking-tight">Tiến độ Khởi tạo</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Quy trình 6 bước xếp TKB</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              50% Hoàn thành
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full w-1/2 rounded-full transition-all duration-500 shadow-md" />
          </div>

          {/* Checklist Step List */}
          <div className="space-y-3">
            {[
              { label: "1. Kế hoạch nhà trường", done: stats.userCount > 1 },
              { label: "2. Danh sách Giáo viên", done: stats.userCount > 1 },
              { label: "3. Danh sách Lớp học", done: stats.classCount > 0 },
              { label: "4. Phân công chuyên môn (AI)", done: false },
              { label: "5. Upload PPCT các môn học", done: false },
              { label: "6. Tiến hành chạy Xếp TKB", done: false },
            ].map((step, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl border transition-all ${
                  step.done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-500 font-normal"
                }`}
                style={{ padding: '16px' }}
              >
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold truncate">{step.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
