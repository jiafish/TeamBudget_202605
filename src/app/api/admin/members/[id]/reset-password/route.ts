import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "無效的成員 ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.newPassword) {
    return NextResponse.json({ error: "缺少新密碼" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) {
    return NextResponse.json({ error: "成員不存在" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(String(body.newPassword), 12);
  await prisma.user.update({
    where: { id: memberId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
