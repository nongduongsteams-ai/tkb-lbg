import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.toLowerCase();

    let extractedText = "";

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // 1. Process Excel
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Filter out completely empty rows
      const nonEmptyRows = json.filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ""));
      
      let md = "";
      for (let i = 0; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i];
        // Convert to markdown table row
        md += "| " + row.map(cell => cell === undefined || cell === null ? "" : String(cell).replace(/\|/g, '-').replace(/\n/g, ' ')).join(" | ") + " |\n";
        
        // Add markdown table separator after first row
        if (i === 0) {
          md += "| " + row.map(() => "---").join(" | ") + " |\n";
        }
      }
      extractedText = md;

    } else if (fileName.endsWith('.docx')) {
      // 2. Process Word (Note: Mammoth text extraction doesn't preserve table pipes automatically)
      // To get good tables, we'd need convertToHtml and an HTML->Markdown converter, 
      // but for now we extract text. If the Word doc has a markdown table, it will parse.
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;

    } else if (fileName.endsWith('.pdf')) {
      // 3. Process PDF
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      extractedText = result.text;

    } else {
      return NextResponse.json({ error: 'Định dạng file không được hỗ trợ' }, { status: 400 });
    }

    return NextResponse.json({ success: true, markdown: extractedText });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + (error.message || 'Unknown error') }, { status: 500 });
  }
}
