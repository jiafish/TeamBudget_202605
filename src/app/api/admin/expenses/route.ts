import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const monthParam =
    searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json({ error: "月份格式必須為 YYYY-MM" }, { status: 400 });
  }

  const [year, mon] = monthParam.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const records = await prisma.expenseRecord.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
    include: { user: { select: { name: true } } },
  });

  // Aggregate: total for the month and per-member subtotals
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  const perMember: Record<string, number> = {};
  for (const r of records) {
    const memberName = r.user.name;
    perMember[memberName] = (perMember[memberName] ?? 0) + r.amount;
  }

  const formatted = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    memberName: r.user.name,
    amount: r.amount,
    date: r.date,
    description: r.description,
    receiptPath: r.receiptPath,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    records: formatted,
    aggregate: { totalAmount, perMember },
    month: monthParam,
  });
}
