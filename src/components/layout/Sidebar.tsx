"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Mail,
  Phone,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string | number;
  subItems?: NavItem[];
}

const navData = [
  {
    title: "Chung",
    items: [
      { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "BGH", "GV"] },
      { 
        label: "Kế hoạch trường", 
        href: "/dashboard/school-plan", 
        icon: BookOpen, 
        roles: ["ADMIN", "BGH"],
        subItems: [
          { label: "Kế hoạch chung", href: "/dashboard/school-plan", icon: BookOpen, roles: ["ADMIN", "BGH"] },
          { label: "Kế hoạch chi tiết", href: "/dashboard/school-plan-detailed", icon: ClipboardList, roles: ["ADMIN", "BGH"] },
        ]
      },
    ]
  },
  {
    title: "Quản lý danh mục",
    items: [
      { label: "Giáo viên", href: "/dashboard/teachers", icon: Users, roles: ["ADMIN", "BGH"] },
      { label: "Môn học & PPCT", href: "/dashboard/subjects", icon: Layers, roles: ["ADMIN", "BGH"] },
      { label: "Lớp học", href: "/dashboard/classes", icon: School, roles: ["ADMIN", "BGH"] },
      { label: "Cơ sở / Phân hiệu", href: "/dashboard/branches", icon: School, roles: ["ADMIN", "BGH"] },
    ]
  },
  {
    title: "Nghiệp vụ",
    items: [
      { label: "Phân công CM", href: "/dashboard/assignments", icon: Sparkles, roles: ["ADMIN", "BGH"] },
      { 
        label: "Thời Khóa Biểu", 
        href: "/dashboard/timetable", 
        icon: Calendar, 
        roles: ["ADMIN", "BGH", "GV"],
        subItems: [
          { label: "TKB THCS - Trường chính", href: "/dashboard/timetable/main-secondary", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
          { label: "TKB THCS - Phân hiệu", href: "/dashboard/timetable/branch", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
          { label: "TKB Tiểu học", href: "/dashboard/timetable/primary", icon: Calendar, roles: ["ADMIN", "BGH", "GV"] },
        ]
      },
      { label: "Lịch Báo Giảng", href: "/dashboard/lbg", icon: ClipboardList, roles: ["ADMIN", "BGH", "GV"] },
    ]
  },
  {
    title: "Hệ thống",
    items: [
      { label: "Cài đặt ứng dụng", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN"] },
    ]
  }
];

export default function Sidebar({ userRole, isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openUserMenu, setOpenUserMenu] = useState(false);
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
          const sectionItems = section.items.filter(item => item.roles.includes(userRole));
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

      {/* User Section */}
      <div className="p-4 px-6 border-t border-[#2d3748] mt-auto">
        <div 
          onClick={() => setOpenUserMenu(!openUserMenu)}
          className={cn(
            "flex items-center p-3 bg-[#2d3748] rounded-lg transition-all duration-200 cursor-pointer relative hover:bg-[#374151]",
            isCollapsed && "justify-center p-2"
          )}
        >
          {openUserMenu && (
            <div className={cn(
              "absolute bg-[#2d3748] rounded-lg p-2 mb-2 z-[1000] shadow-lg",
              isCollapsed ? "left-[110%] bottom-0 w-[200px]" : "bottom-[110%] left-0 w-full"
            )}>
              <div className="text-sm font-medium text-white px-3 py-2 border-b border-[#374151] mb-2 truncate">
                admin@truong.edu.vn
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full flex items-center p-3 text-[#DFE278] rounded-md transition-all duration-200 hover:bg-[#374151]"
              >
                <LogOut className="text-xl mr-3 min-w-5 text-center" />
                <span className="text-sm font-medium">Đăng xuất</span>
              </button>
            </div>
          )}

          <div className={cn(
            "relative w-10 h-10 bg-[#1a1c23] rounded-lg flex items-center justify-center",
            !isCollapsed && "mr-3"
          )}>
            <UserCircle className="w-6 h-6 text-[#DFE278]" />
          </div>
          
          {!isCollapsed && (
            <div className="flex-grow min-w-0">
              <div className="text-[#DFE278] text-sm font-medium flex items-center justify-between">
                <span className="truncate">Quản trị viên</span>
                {openUserMenu ? (
                  <ChevronDown className="w-4 h-4 text-[#a0aec0] flex-shrink-0" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-[#a0aec0] flex-shrink-0" />
                )}
              </div>
              <div className="text-[#a0aec0] text-xs mt-1 truncate">Admin System</div>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="text-center text-xs text-[#a0aec0] mt-4 font-medium opacity-60">
            &copy; 2026 Nông Dưỡng
          </div>
        )}
      </div>
    </aside>
  );
}
