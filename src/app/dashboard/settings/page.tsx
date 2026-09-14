import { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Cài đặt hệ thống - TKB Pro",
  description: "Cấu hình năm học, tuần học và các cài đặt chung",
};

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">Cài đặt ứng dụng</h2>
      </div>
      
      {/* We will embed SettingsClient directly, which contains Tabs or just the Week Settings */}
      <SettingsClient />
    </div>
  );
}
