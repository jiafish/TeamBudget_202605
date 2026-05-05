import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEMO_REIMBURSEMENTS = [
  { id: 1, targetUserId: 2, targetName: "陳美玲", managerUserId: 1, managerName: "王小明", reimbursed: true, creditAmount: 500, note: "四月差旅補發", createdAt: "2026-04-30T10:00:00.000Z" },
  { id: 2, targetUserId: 3, targetName: "李建宏", managerUserId: 1, managerName: "王小明", reimbursed: false, creditAmount: 300, note: null, createdAt: "2026-05-01T09:00:00.000Z" },
];

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(DEMO_REIMBURSEMENTS);
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
