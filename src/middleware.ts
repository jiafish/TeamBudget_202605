import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/demo-login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  let payload: { userId: number; role: string } | null = null;
  try {
    const result = await jwtVerify(token, JWT_SECRET);
    payload = result.payload as { userId: number; role: string };
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    payload.role !== "MANAGER" &&
    (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "禁止存取" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
