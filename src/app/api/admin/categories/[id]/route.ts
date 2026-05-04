import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "無效的類別 ID" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "類別不存在" }, { status: 404 });
  }

  const linkedCount = await prisma.expenseRecord.count({
    where: { categoryId },
  });
  if (linkedCount > 0) {
    return NextResponse.json(
      { error: "此類別已有支出記錄，無法刪除" },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return NextResponse.json({ ok: true });
}
