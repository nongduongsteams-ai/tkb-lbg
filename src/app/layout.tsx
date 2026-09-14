import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: {
    default: "TKB-LBG | Hệ thống Quản lý Thời Khóa Biểu",
    template: "%s | TKB-LBG",
  },
  description:
    "Hệ thống quản lý Thời Khóa Biểu và Lịch Báo Giảng cho trường THCS. Hỗ trợ xếp lịch tự động, tích hợp AI và PWA cho giáo viên.",
  keywords: ["thời khóa biểu", "lịch báo giảng", "quản lý trường học", "THCS"],
  authors: [{ name: "TKB-LBG Team" }, { name: "Nông Dưỡng" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TKB-LBG",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
