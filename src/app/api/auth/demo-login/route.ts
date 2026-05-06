import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  console.warn("[DEMO] demo-login called — ensure DEMO_MODE is not set in production");

  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const role = body?.role === "MEMBER" ? "MEMBER" : "MANAGER";
  const userId = role === "MANAGER" ? 0 : 1;

  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(JWT_SECRET);

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}
