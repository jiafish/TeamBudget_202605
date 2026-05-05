import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEMO_RECORDS = [
  { id: 1, userId: 2, memberName: "陳美玲", amount: 450, date: "2026-05-02T00:00:00.000Z", description: "午餐聚會", receiptPath: null, categoryId: 1, category: { id: 1, name: "餐費" }, createdAt: "2026-05-02T08:30:00.000Z" },
  { id: 2, userId: 3, memberName: "李建宏", amount: 200, date: "2026-05-03T00:00:00.000Z", description: "捷運月票", receiptPath: null, categoryId: 2, category: { id: 2, name: "交通費" }, createdAt: "2026-05-03T09:00:00.000Z" },
  { id: 3, userId: 1, memberName: "王小明", amount: 800, date: "2026-05-03T00:00:00.000Z", description: "印表機墨水匣", receiptPath: null, categoryId: 3, category: { id: 3, name: "辦公用品" }, createdAt: "2026-05-03T10:15:00.000Z" },
  { id: 4, userId: 2, memberName: "陳美玲", amount: 750, date: "2026-05-04T00:00:00.000Z", description: "客戶餐敘", receiptPath: null, categoryId: 1, category: { id: 1, name: "餐費" }, createdAt: "2026-05-04T12:00:00.000Z" },
  { id: 5, userId: 1, memberName: "王小明", amount: 1000, date: "2026-05-04T00:00:00.000Z", description: "差旅交通費", receiptPath: null, categoryId: 2, category: { id: 2, name: "交通費" }, createdAt: "2026-05-04T14:00:00.000Z" },
];

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  if (process.env.DEMO_MODE === "true") {
    const monthParam = searchParams.get("month") ?? "2026-05";
    const totalAmount = DEMO_RECORDS.reduce((s, r) => s + r.amount, 0);
    const perMember: Record<string, number> = {};
    for (const r of DEMO_RECORDS) {
      perMember[r.memberName] = (perMember[r.memberName] ?? 0) + r.amount;
    }
    return NextResponse.json({ records: DEMO_RECORDS, aggregate: { totalAmount, perMember }, month: monthParam });
  }


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

  // categoryId filter: omitted = all, "null" = uncategorized, integer = specific category
  const categoryParam = searchParams.get("categoryId");
  let categoryFilter: { categoryId: number | null } | undefined;
  if (categoryParam !== null) {
    if (categoryParam === "null") {
      categoryFilter = { categoryId: null };
    } else {
      const parsed = parseInt(categoryParam);
      if (!isNaN(parsed)) categoryFilter = { categoryId: parsed };
    }
  }

  const records = await prisma.expenseRecord.findMany({
    where: {
      date: { gte: start, lt: end },
      ...categoryFilter,
    },
    orderBy: { date: "desc" },
    include: {
      user: { select: { name: true } },
      category: { select: { id: true, name: true } },
    },
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
    categoryId: r.categoryId,
    category: r.category,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({
    records: formatted,
    aggregate: { totalAmount, perMember },
    month: monthParam,
  });
}
