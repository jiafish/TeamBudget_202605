import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  const user = await prisma.user.findUnique({
    where: { id: memberId, deletedAt: null },
  });
  if (!user) {
    return NextResponse.json({ error: "成員不存在" }, { status: 404 });
  }

  const logs = await prisma.memberAllocationSettingLog.findMany({
    where: { memberUserId: memberId },
    include: { manager: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = logs.map((row) => ({
    id: row.id,
    monthlyAllocationAfter: row.monthlyAllocationAfter,
    requestedBackfillFromMonth: row.requestedBackfillFromMonth,
    requestedBackfillToMonth: row.requestedBackfillToMonth,
    effectiveBackfillFromMonth: row.effectiveBackfillFromMonth,
    effectiveBackfillToMonth: row.effectiveBackfillToMonth,
    backfilledMonthsCount: row.backfilledMonthsCount,
    createdAt: row.createdAt.toISOString(),
    managerName: row.manager?.name ?? "—",
  }));

  return NextResponse.json(result);
}
