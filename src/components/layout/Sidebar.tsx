"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  School,
  ClipboardList,
  Calendar,
  Settings,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  UserCircle,
  LogOut,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole: string;
  userPermissions: string[];
  userName?: string;
  userEmail?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

import { SystemAction } from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  actions?: SystemAction[];
  badge?: string | number;
  subItems?: NavItem[];
}

const navData: { title: string; items: NavItem[] }[] = [
  {
    title: "Chung",
    items: [
      { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BGH", "GV"] },
      { 
        label: "Kế hoạch trường", 
        href: "/dashboard/school-plan", 
        icon: BookOpen, 
        actions: ["MANAGE_SCHOOL_PLAN"],
        roles: ["ADMIN", "BGH", "GV"],
        subItems: [
          { label: "Kế hoạch chung", href: "/dashboard/school-plan", icon: BookOpen, actions: ["MANAGE_SCHOOL_PLAN"], roles: ["ADMIN", "BGH", "GV"] },
          { label: "Kế hoạch chi tiết", href: "/dashboard/school-plan-detailed", icon: ClipboardList, actions: ["MANAGE_SCHOOL_PLAN"], roles: ["ADMIN", "BGH", "GV"] },
        ]
      },
    ]
  },
  {
    title: "Quản lý danh mục",
    items: [
      { label: "Giáo viên", href: "/dashboard/teachers", icon: Users, actions: ["MANAGE_USERS"] },
      { label: "Môn học & PPCT", href: "/dashboard/subjects", icon: Layers, actions: ["MANAGE_SUBJECTS", "MANAGE_PPCT"] },
      { label: "Lớp học", href: "/dashboard/classes", icon: School, roles: ["ADMIN", "BGH"] },
      { label: "Cơ sở / Phân hiệu", href: "/dashboard/branches", icon: School, roles: ["ADMIN", "BGH"] },
    ]
  },
  {
    title: "Nghiệp vụ",
    items: [
      { label: "Phân công CM", href: "/dashboard/assignments", icon: Sparkles, actions: ["MANAGE_ASSIGNMENTS"] },
      { 
        label: "Thời Khóa Biểu", 
        href: "/dashboard/timetable", 
        icon: Calendar, 
        roles: ["ADMIN", "BGH", "GV"],
        subItems: [
          { label: "TKB THCS - Trường chính", href: "/dashboard/timetable/main-secondary", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
          { label: "TKB THCS - Phân hiệu", href: "/dashboard/timetable/branch", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
          { label: "TKB TH Nghinh Tường", href: "/dashboard/timetable/primary", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
          { label: "TKB Phân hiệu TH", href: "/dashboard/timetable/primary-branch", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
        ]
      },
      { label: "Lịch Báo Giảng", href: "/dashboard/lbg", icon: ClipboardList, roles: ["ADMIN", "BGH", "GV"] },
    ]
  },
  {
    title: "Hệ thống",
    items: [
      { label: "Hồ sơ & Mật khẩu", href: "/dashboard/profile", icon: UserCog, roles: ["ADMIN", "BGH", "GV"] },
      { label: "Cài đặt ứng dụng", href: "/dashboard/settings", icon: Settings, actions: ["MANAGE_SETTINGS"] },
      { label: "Phân quyền", href: "/dashboard/settings/permissions", icon: Settings, roles: ["ADMIN"] },
    ]
  }
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  BGH: "Ban Giám Hiệu",
  GV: "Giáo viên",
};

export default function Sidebar({ userRole, userPermissions, userName, userEmail, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "/dashboard/school-plan": true
  });

  // Prefetch trang khi hover — tải sẵn trước khi click
  const handlePrefetch = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const [roleMappings, setRoleMappings] = useState<Record<string, string[]>>({});
  
  
  useEffect(() => {
    import("@/actions/config").then((m) => {
      m.getRolePermissions().then(setRoleMappings);
    });
  }, []);

  const effectiveActions = useMemo(() => {
    const actions = new Set<string>();
    if (roleMappings[userRole]) {
      roleMappings[userRole].forEach(a => actions.add(a));
    }
    userPermissions.forEach(p => {
      if (roleMappings[p]) {
        roleMappings[p].forEach(a => actions.add(a));
      }
    });
    return Array.from(actions);
  }, [roleMappings, userRole, userPermissions]);

  const hasAccess = useCallback((item: NavItem) => {
    if (userRole === "ADMIN") return true;
    if (item.roles && item.roles.includes(userRole)) return true;
    if (item.actions && item.actions.some(a => effectiveActions.includes(a))) return true;
    return false;
  }, [userRole, effectiveActions]);

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-screen bg-[#1a1c23] text-[#a0aec0] py-6 flex flex-col z-[99] transition-all duration-300",
        isCollapsed ? "w-[80px]" : "w-[250px]"
      )}
    >
      {/* Logo Area */}
      <div className={cn(
        "h-[60px] mb-6 flex items-center relative",
        isCollapsed ? "px-2 justify-center" : "px-6"
      )}>
        <svg className={cn("w-8 h-8 flex-shrink-0 fill-[#DFE278]", !isCollapsed && "mr-3")} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        {!isCollapsed && (
          <span className="text-xl font-semibold text-white whitespace-nowrap">TKB Pro</span>
        )}
        <div 
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 bg-[#DFE278] text-[#1a1c23] w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-2 border-[#1a1c23] transition-transform duration-300 z-10",
            isCollapsed ? "-right-3 rotate-180" : "-right-3"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        {navData.map((section, idx) => {
          const sectionItems = section.items.filter(item => hasAccess(item));
          if (sectionItems.length === 0) return null;

          return (
            <div key={idx} className="my-6">
              {!isCollapsed && (
                <div className="text-xs font-semibold uppercase tracking-wider text-[#A8B060] mb-3 pl-4">
                  {section.title}
                </div>
              )}
              
              <div className="space-y-2">
                {sectionItems.map((item) => {
                  const Icon = item.icon;
                  const isExactActive = pathname === item.href;
                  const isActive = item.href === "/dashboard" 
                    ? pathname === "/dashboard" 
                    : pathname.startsWith(item.href);
                    
                  const hasSub = item.subItems && item.subItems.length > 0;
                  const isExpanded = expandedMenus[item.href];

                  return (
                    <div key={item.href}>
                      {hasSub ? (
                        <div
                          onClick={() => toggleMenu(item.href)}
                          className={cn(
                            "flex items-center justify-between py-3 rounded-md cursor-pointer transition-all duration-200 w-full group",
                            isCollapsed ? "justify-center px-0" : "px-4",
                            isActive 
                              ? "bg-[#2d3748] text-[#DFE278]" 
                              : "hover:bg-[#2d3748] hover:text-[#DFE278]"
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div className="flex items-center">
                            <Icon className={cn("text-xl min-w-5 text-center", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                          </div>
                          {!isCollapsed && (
                            isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      ) : (
                        <Link href={item.href} className="block" onMouseEnter={() => handlePrefetch(item.href)}>
                          <div
                            className={cn(
                              "flex items-center py-3 rounded-md cursor-pointer transition-all duration-200 w-full group",
                              isCollapsed ? "justify-center px-0" : "px-4",
                              isActive && !hasSub
                                ? "bg-[#2d3748] text-[#DFE278]" 
                                : "hover:bg-[#2d3748] hover:text-[#DFE278]"
                            )}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon className={cn("text-xl min-w-5 text-center", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                          </div>
                        </Link>
                      )}

                      {/* Render subitems */}
                      {hasSub && isExpanded && !isCollapsed && (
                        <div className="mt-1 space-y-1">
                          {item.subItems?.map(subItem => {
                            const SubIcon = subItem.icon;
                            const isSubActive = pathname === subItem.href;
                            
                            return (
                              <Link key={subItem.href} href={subItem.href} className="block" onMouseEnter={() => handlePrefetch(subItem.href)}>
                                <div
                                  className={cn(
                                    "flex items-center py-2 pr-4 rounded-md cursor-pointer transition-all duration-200 w-full",
                                    isSubActive
                                      ? "bg-[#2d3748]/50 text-[#DFE278]" 
                                      : "text-[#a0aec0] hover:text-white hover:bg-[#2d3748]/30"
                                  )}
                                  style={{ paddingLeft: "30px" }}
                                >
                                  <span className="text-sm">{subItem.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Copyright Section */}
      <div className="p-6 border-t border-[#2d3748] mt-auto bg-[#1a1c23]">
        {!isCollapsed ? (
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#a0aec0] mb-0.5">
              Phát triển bởi
            </div>
            <div className="text-base font-black bg-gradient-to-r from-[#DFE278] via-[#4ade80] to-[#2dd4bf] bg-clip-text text-transparent drop-shadow-md pb-1 text-center tracking-wide">
              Nông Dưỡng - AI
            </div>
            <div className="text-[10px] text-[#a0aec0]/70 font-medium mt-1">
              &copy; 2026 TKB Pro Ver 1.3.7
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full h-full pb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#DFE278] to-[#2dd4bf] flex items-center justify-center shadow-lg shadow-[#DFE278]/20" title="Phát triển bởi Nông Dưỡng - AI">
              <span className="text-[#1a1c23] font-extrabold text-sm tracking-tighter">ND</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
