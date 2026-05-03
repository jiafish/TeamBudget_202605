import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const [users, expenseByUser, expenseGrand, allocGrand] = await Promise.all([
    prisma.user.findMany({
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
    prisma.user.aggregate({ _sum: { monthlyAllocation: true } }),
  ]);

  const spentByUser = new Map<number, number>();
  for (const row of expenseByUser) {
    spentByUser.set(row.userId, row._sum.amount ?? 0);
  }

  const sumMonthlyAllocation = allocGrand._sum.monthlyAllocation ?? 0;
  const sumTotalExpense = expenseGrand._sum.amount ?? 0;
  const teamDisplayRemaining = sumMonthlyAllocation - sumTotalExpense;

  const members = users.map((u) => {
    const totalExpense = spentByUser.get(u.id) ?? 0;
    const displayRemaining = u.monthlyAllocation - totalExpense;
    return {
      ...u,
      totalExpense,
      displayRemaining,
    };
  });

  return NextResponse.json({
    members,
    totals: {
      sumMonthlyAllocation,
      sumTotalExpense,
      teamDisplayRemaining,
    },
  });
}
