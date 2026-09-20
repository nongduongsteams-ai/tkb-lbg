export const SYSTEM_ACTIONS = [
  { id: "MANAGE_USERS", label: "Quản lý Giáo viên & Chức vụ" },
  { id: "MANAGE_SCHOOL_PLAN", label: "Quản lý Khung KHGD" },
  { id: "MANAGE_SUBJECTS", label: "Quản lý Môn học" },
  { id: "MANAGE_PPCT", label: "Quản lý Phân phối CT" },
  { id: "MANAGE_ASSIGNMENTS", label: "Phân công chuyên môn" },
  { id: "MANAGE_TIMETABLE", label: "Quản lý Thời khóa biểu" },
  { id: "VIEW_ALL_LBG", label: "Xem LBG toàn trường" },
  { id: "MANAGE_SETTINGS", label: "Cài đặt hệ thống" }
] as const;

export type SystemAction = typeof SYSTEM_ACTIONS[number]["id"];

export const ALL_ROLES_AND_TITLES = [
  "ADMIN",
  "BGH HT",
  "BGH PHT",
  "BGH",
  "Tổ trưởng",
  "Tổ phó",
  "TPT Đội",
  "Phó TPT Đội",
  "GVBM",
  "GV",
  "Nhân viên"
];

// Default fallback permissions if config is empty
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  "ADMIN": SYSTEM_ACTIONS.map(a => a.id),
  "BGH": SYSTEM_ACTIONS.map(a => a.id),
  "BGH HT": SYSTEM_ACTIONS.map(a => a.id),
  "BGH PHT": SYSTEM_ACTIONS.map(a => a.id),
  "Tổ trưởng KHTN": ["MANAGE_TIMETABLE", "MANAGE_SUBJECTS", "VIEW_ALL_LBG", "MANAGE_PPCT", "MANAGE_ASSIGNMENTS"],
  "Tổ trưởng KHXH": ["MANAGE_TIMETABLE", "MANAGE_SUBJECTS", "VIEW_ALL_LBG", "MANAGE_PPCT", "MANAGE_ASSIGNMENTS"],
  "Tổ phó KHTN": ["MANAGE_TIMETABLE", "VIEW_ALL_LBG"],
  "Tổ phó KHXH": ["MANAGE_TIMETABLE", "VIEW_ALL_LBG"],
  "TPT Đội": ["VIEW_ALL_LBG"],
  "Phó TPT Đội": ["VIEW_ALL_LBG"],
  "GV": [],
  "GVBM": ["MANAGE_PPCT"]
};
