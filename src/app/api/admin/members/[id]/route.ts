import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "無效的成員 ID" }, { status: 400 });
  }

  if (memberId === session.userId) {
    return NextResponse.json({ error: "不能刪除自己的帳號" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) {
    return NextResponse.json({ error: "成員不存在" }, { status: 404 });
  }

  if (user.role === "MANAGER") {
    const managerCount = await prisma.user.count({
      where: { role: "MANAGER", deletedAt: null },
    });
    if (managerCount <= 1) {
      return NextResponse.json(
        { error: "無法刪除唯一的管理者帳號" },
        { status: 400 }
      );
    }
  }

  await prisma.user.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
