import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Chuyển số thứ trong tuần thành tên tiếng Việt
export function dayOfWeekName(day: number): string {
  const days: Record<number, string> = {
    2: "Thứ Hai",
    3: "Thứ Ba",
    4: "Thứ Tư",
    5: "Thứ Năm",
    6: "Thứ Sáu",
    7: "Thứ Bảy",
  };
  return days[day] ?? `Thứ ${day}`;
}

// Trạng thái tiết dạy → màu sắc
export function slotStatusColor(scheduled: number, planned: number): "green" | "red" | "yellow" {
  if (scheduled === planned) return "green";
  if (scheduled < planned) return "red";
  return "yellow";
}

// Format số tiết: "3/4"
export function formatSlotRatio(scheduled: number, planned: number): string {
  return `${scheduled}/${planned}`;
}
