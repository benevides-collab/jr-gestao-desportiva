import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("jr_session")?.value);
  const isProtectedRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/professor");

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/professor/:path*",
    "/acesso-negado",
    "/dashboard/:path*",
    "/usuarios/:path*",
    "/configuracoes/:path*",
  ],
};
