// web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

// ✅ Các route được phép truy cập khi CHƯA đăng nhập// web/middleware.ts
const PUBLIC_ROUTES = ["/auth", "/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bỏ qua next internals + file tĩnh
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Bỏ qua asset folders để video/bg, nhạc demo không bị chặn
  if (
    pathname.startsWith("/music") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // ✅ Nếu đang vào /auth /login /register => luôn cho qua (KHÔNG redirect)
  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isPublic) {
    return NextResponse.next();
  }

  // ✅ Các route còn lại: yêu cầu token cookie
  // (bạn có thể đang dùng "token" hoặc "accessToken" -> check cả 2)
  const token =
    req.cookies.get("token")?.value || req.cookies.get("accessToken")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth"; // Landing auth của bạn
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
