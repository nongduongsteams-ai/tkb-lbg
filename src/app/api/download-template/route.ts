import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const data = [
      ["TT", "Tiết PPCT", "Tên bài học", "Ghi chú"],
      [1, 1, "Bài 1: Giới thiệu chung", "Ghi chú mẫu (nếu có)"],
      [2, 2, "Bài 2: Nội dung chi tiết 1", ""],
      [3, 3, "Bài 3: Nội dung chi tiết 2", ""],
      [4, 4, "Kiểm tra 15 phút", "Kiểm tra"],
    ];

    const worksheet = xlsx.utils.aoa_to_sheet(data);
    
    // Auto adjust column widths
    worksheet['!cols'] = [
      { wch: 5 },  // TT
      { wch: 12 }, // Tiết PPCT
      { wch: 40 }, // Tên bài học
      { wch: 20 }, // Ghi chú
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "PPCT");

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Mau_Import_PPCT.xlsx"'
      }
    });
  } catch (error) {
    console.error("Lỗi khi tạo file mẫu:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
