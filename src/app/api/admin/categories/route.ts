import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEMO_CATEGORIES = [
  { id: 1, name: "餐費" },
  { id: 2, name: "交通費" },
  { id: 3, name: "辦公用品" },
];

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json(DEMO_CATEGORIES);
  }

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "類別名稱不能為空" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "類別名稱已存在" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { name },
    select: { id: true, name: true },
  });

  return NextResponse.json(category, { status: 201 });
}
