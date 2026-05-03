import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.loginNumber || !body?.password) {
    return NextResponse.json({ error: "登入號碼或密碼錯誤" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { loginNumber: String(body.loginNumber) },
  });

  if (!user) {
    return NextResponse.json({ error: "登入號碼或密碼錯誤" }, { status: 401 });
  }

  const valid = await bcrypt.compare(String(body.password), user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "登入號碼或密碼錯誤" }, { status: 401 });
  }

  const token = await new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
