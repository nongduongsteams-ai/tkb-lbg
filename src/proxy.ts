import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/login", "/api/auth"];
const adminRoutes = ["/dashboard/settings"];
const bghRoutes = [
  "/dashboard/school-plan",
  "/dashboard/users",
  "/dashboard/subjects",
  "/dashboard/classes",
  "/dashboard/assignments",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lấy JWT token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Cho phép public routes
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Chưa đăng nhập → redirect login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;

  // Kiểm tra quyền Admin
  if (adminRoutes.some((r) => pathname.startsWith(r))) {
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Kiểm tra quyền BGH (GV bị chặn)
  if (bghRoutes.some((r) => pathname.startsWith(r))) {
    if (userRole === "GV") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
