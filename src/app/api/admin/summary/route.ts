import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Each member includes monthlyAllocation (stipend), allocationLogSumLifetime (sum of MonthlyAllocationLog), allocationSettingHistory (newest first, max 50). */

const allocationLogWithManager =
  Prisma.validator<Prisma.MemberAllocationSettingLogDefaultArgs>()({
    include: { manager: { select: { name: true } } },
  });
type MemberAllocationSettingLogWithManager = Prisma.MemberAllocationSettingLogGetPayload<
  typeof allocationLogWithManager
>;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const [users, expenseByUser, expenseGrand, allocGrand, logSumByUser, supplementByUser] =
    await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          loginNumber: true,
          role: true,
          monthlyAllocation: true,
          balance: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.expenseRecord.groupBy({
        by: ["userId"],
        _sum: { amount: true },
      }),
      prisma.expenseRecord.aggregate({ _sum: { amount: true } }),
      prisma.user.aggregate({ where: { deletedAt: null }, _sum: { monthlyAllocation: true } }),
      prisma.monthlyAllocationLog.groupBy({
        by: ["userId"],
        _sum: { amount: true },
      }),
      prisma.reimbursementDecision.groupBy({
        by: ["targetUserId"],
        where: { reimbursed: true },
        _sum: { creditAmount: true },
      }),
    ]);

  let allocationLogs: MemberAllocationSettingLogWithManager[] = [];
  try {
    allocationLogs = await prisma.memberAllocationSettingLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        manager: { select: { name: true } },
      },
    });
  } catch {
    allocationLogs = [];
  }

  const ALLOCATION_AUDIT_HISTORY_MAX = 50;

  function serializeAuditRow(row: MemberAllocationSettingLogWithManager) {
    return {
      requestedBackfillFromMonth: row.requestedBackfillFromMonth,
      requestedBackfillToMonth: row.requestedBackfillToMonth,
      effectiveBackfillFromMonth: row.effectiveBackfillFromMonth,
      effectiveBackfillToMonth: row.effectiveBackfillToMonth,
      monthlyAllocationAfter: row.monthlyAllocationAfter,
      backfilledMonthsCount: row.backfilledMonthsCount,
      createdAt: row.createdAt.toISOString(),
      managerName: row.manager?.name ?? "—",
    };
  }

  const allocationHistoryByMember = new Map<
    number,
    ReturnType<typeof serializeAuditRow>[]
  >();
  for (const row of allocationLogs) {
    const list = allocationHistoryByMember.get(row.memberUserId) ?? [];
    if (list.length < ALLOCATION_AUDIT_HISTORY_MAX) {
      list.push(serializeAuditRow(row));
      allocationHistoryByMember.set(row.memberUserId, list);
    }
  }

  const spentByUser = new Map<number, number>();
  for (const row of expenseByUser) {
    spentByUser.set(row.userId, row._sum.amount ?? 0);
  }

  const logSumByUserId = new Map<number, number>();
  for (const row of logSumByUser) {
    logSumByUserId.set(row.userId, row._sum.amount ?? 0);
  }

  const supplementByUserId = new Map<number, number>();
  for (const row of supplementByUser) {
    supplementByUserId.set(row.targetUserId, row._sum.creditAmount ?? 0);
  }

  const sumMonthlyAllocation = allocGrand._sum.monthlyAllocation ?? 0;
  const sumTotalExpense = expenseGrand._sum.amount ?? 0;
  const sumAllocationLogs =
    logSumByUser.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
  const sumSupplementCredits = supplementByUser.reduce(
    (s, r) => s + (r._sum.creditAmount ?? 0),
    0
  );
  /** 與成員端「分配經費＋補發加總 − 支出」一致：全站月配 log 加總 + 已入帳補發 − 全站支出 */
  const teamDisplayRemaining =
    sumAllocationLogs + sumSupplementCredits - sumTotalExpense;

  const members = users.map((u) => {
    const totalExpense = spentByUser.get(u.id) ?? 0;
    const fromLogs = logSumByUserId.get(u.id) ?? 0;
    const fromSupplements = supplementByUserId.get(u.id) ?? 0;
    const displayRemaining = fromLogs + fromSupplements - totalExpense;
    const allocationSettingHistory =
      allocationHistoryByMember.get(u.id) ?? [];
    const allocationLogSumLifetime = fromLogs;
    return {
      ...u,
      totalExpense,
      displayRemaining,
      allocationLogSumLifetime,
      allocationSettingHistory,
    };
  });

  return NextResponse.json({
    members,
    totals: {
      sumMonthlyAllocation,
      sumTotalExpense,
      teamDisplayRemaining,
      sumAllocationLogs,
      sumSupplementCredits,
    },
  });
}
