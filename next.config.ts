import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cấu hình cho Vercel
  reactStrictMode: true,

  // Images từ domain ngoài (nếu cần)
  images: {
    domains: [],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Headers bảo mật
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Service Worker scope
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },

  // Cấu hình cho file Excel export
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
