import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returned monthlyAllocation is the monthly stipend (per-month rate). totalAllocatedFromLogs is the lifetime sum of MonthlyAllocationLog.amount. */

const allocationSettingWithManager =
  Prisma.validator<Prisma.MemberAllocationSettingLogDefaultArgs>()({
    include: { manager: { select: { name: true } } },
  });
type MemberAllocationSettingLogWithManager = Prisma.MemberAllocationSettingLogGetPayload<
  typeof allocationSettingWithManager
>;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!requireRole(session, "MEMBER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const userId = session.userId;

  const [user, logSum, expenseSum, supplementSum] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { monthlyAllocation: true },
    }),
    prisma.monthlyAllocationLog.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.expenseRecord.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.reimbursementDecision.aggregate({
      where: { targetUserId: userId, reimbursed: true },
      _sum: { creditAmount: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  let latestSetting: MemberAllocationSettingLogWithManager | null = null;
  try {
    latestSetting = await prisma.memberAllocationSettingLog.findFirst({
      where: { memberUserId: userId },
      orderBy: { createdAt: "desc" },
      include: { manager: { select: { name: true } } },
    });
  } catch {
    latestSetting = null;
  }

  const totalAllocatedFromLogs = logSum._sum.amount ?? 0;
  const totalSupplementCreditsReimbursed =
    supplementSum._sum.creditAmount ?? 0;
  const totalAllocationAndSupplements =
    totalAllocatedFromLogs + totalSupplementCreditsReimbursed;
  const totalExpenseAllTime = expenseSum._sum.amount ?? 0;
  const availableAfterAllocationsAndSupplements =
    totalAllocationAndSupplements - totalExpenseAllTime;

  const lastAllocationSetting = latestSetting
    ? {
        requestedBackfillFromMonth: latestSetting.requestedBackfillFromMonth,
        requestedBackfillToMonth: latestSetting.requestedBackfillToMonth,
        effectiveBackfillFromMonth: latestSetting.effectiveBackfillFromMonth,
        effectiveBackfillToMonth: latestSetting.effectiveBackfillToMonth,
        monthlyAllocationAfter: latestSetting.monthlyAllocationAfter,
        backfilledMonthsCount: latestSetting.backfilledMonthsCount,
        createdAt: latestSetting.createdAt.toISOString(),
        managerName: latestSetting.manager?.name ?? "—",
      }
    : null;

  return NextResponse.json({
    monthlyAllocation: user.monthlyAllocation,
    totalAllocatedFromLogs,
    totalSupplementCreditsReimbursed,
    totalAllocationAndSupplements,
    totalExpenseAllTime,
    availableAfterAllocationsAndSupplements,
    availableFromAllocations: availableAfterAllocationsAndSupplements,
    lastAllocationSetting,
  });
}
