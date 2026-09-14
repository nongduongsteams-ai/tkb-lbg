# TKB-LBG Web Application

Ứng dụng quản lý Thời Khóa Biểu và Lịch Báo Giảng cho trường THCS.

## Stack công nghệ

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Prisma
- **Auth**: NextAuth v4
- **Deploy**: Vercel
- **AI**: Google Gemini API

## Cài đặt & Chạy thử

### 1. Clone & Install

```bash
cd web
npm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env.local
# Chỉnh sửa .env.local với thông tin DB và API keys của bạn
```

### 3. Kết nối Database (Neon)

1. Tạo tài khoản tại [neon.tech](https://neon.tech)
2. Tạo project mới → copy connection string
3. Dán vào `DATABASE_URL` và `DIRECT_URL` trong `.env.local`

### 4. Khởi tạo Database

```bash
npm run db:push      # Tạo bảng theo schema
npm run db:seed      # Nạp dữ liệu mẫu
```

### 5. Chạy development

```bash
npm run dev
# → http://localhost:3000
```

## Tài khoản mặc định (sau khi seed)

| Role | Email | Mật khẩu |
|------|-------|-----------|
| Admin | admin@truong.edu.vn | Admin@123 |
| BGH | hieupho@truong.edu.vn | BGH@123 |
| GV | duong@truong.edu.vn | GV@123 |

## Scripts

```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema lên DB (không tạo migration)
npm run db:migrate   # Tạo migration file
npm run db:seed      # Seed dữ liệu mẫu
npm run db:studio    # Mở Prisma Studio
```

## Deploy lên Vercel

1. Push code lên GitHub
2. Import repo vào [vercel.com](https://vercel.com)
3. Thêm Environment Variables (DATABASE_URL, NEXTAUTH_SECRET, GEMINI_API_KEY)
4. Deploy!

## Cấu trúc thư mục

```
src/
├── app/
│   ├── api/           # API Routes (Backend serverless)
│   │   ├── auth/      # NextAuth
│   │   ├── users/     # CRUD giáo viên
│   │   ├── subjects/  # CRUD môn học
│   │   ├── classes/   # CRUD lớp học
│   │   ├── timetable/ # TKB API (Core)
│   │   ├── lbg/       # Lịch báo giảng API
│   │   └── ai/        # Smart Importer AI
│   ├── dashboard/     # Dashboard pages (BGH/Admin)
│   ├── login/         # Trang đăng nhập
│   └── mobile/        # PWA view cho GV
├── components/
│   ├── layout/        # Sidebar, TopBar
│   ├── timetable/     # TKB Grid, DnD
│   └── ui/            # Shared UI components
├── lib/
│   ├── prisma.ts      # Prisma client
│   ├── auth.ts        # NextAuth config
│   ├── session.ts     # Session helpers
│   └── utils.ts       # Utilities
└── types/             # TypeScript types
```
