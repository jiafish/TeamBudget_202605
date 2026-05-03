import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const rows = await prisma.reimbursementDecision.findMany({
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
