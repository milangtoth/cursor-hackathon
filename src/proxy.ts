import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, readSession } from "@/lib/session";

export function proxy(request: NextRequest) {
  const session = readSession(request.cookies.get(COOKIE_NAME)?.value);
  const path = request.nextUrl.pathname;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin")) {
    const dest = session.role === "admin" ? "/login" : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (path.startsWith("/teacher") && session.role !== "teacher" && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/admin/:path*"],
};
