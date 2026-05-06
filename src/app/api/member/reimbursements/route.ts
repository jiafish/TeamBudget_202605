import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_MEMBER_REIMBURSEMENTS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!requireRole(session, "MEMBER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(
      DEMO_MEMBER_REIMBURSEMENTS.filter((r) => r.targetUserId === session.userId)
    );
  }

  const rows = await prisma.reimbursementDecision.findMany({
    where: { targetUserId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      target: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      targetUserId: r.targetUserId,
      targetName: r.target.name,
      managerUserId: r.managerUserId,
      managerName: r.manager.name,
      reimbursed: r.reimbursed,
      creditAmount: r.creditAmount,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
