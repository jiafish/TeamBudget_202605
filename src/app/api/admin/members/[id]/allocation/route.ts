import { NextRequest, NextResponse } from "next/server";
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
  const amount = Number(body?.monthlyAllocation);
  if (!Number.isInteger(amount) || amount < 0) {
    return NextResponse.json(
      { error: "分配金額必須為 0 或正整數" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) {
    return NextResponse.json({ error: "成員不存在" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: memberId },
    data: { monthlyAllocation: amount },
    select: { id: true, name: true, monthlyAllocation: true },
  });

  return NextResponse.json(updated);
}
