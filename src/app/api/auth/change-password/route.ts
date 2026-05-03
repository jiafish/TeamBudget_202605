import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.currentPassword || !body?.newPassword) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  const valid = await bcrypt.compare(String(body.currentPassword), user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "目前密碼錯誤" }, { status: 401 });
  }

  const newHash = await bcrypt.hash(String(body.newPassword), 12);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  // Invalidate current session by clearing the cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
