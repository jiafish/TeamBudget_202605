import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const members = await prisma.user.findMany({
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
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.loginNumber || !body?.password) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { loginNumber: String(body.loginNumber) },
  });
  if (existing) {
    return NextResponse.json(
      { error: "此登入號碼已被使用" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(String(body.password), 12);
  const user = await prisma.user.create({
    data: {
      name: String(body.name),
      loginNumber: String(body.loginNumber),
      passwordHash,
      role: "MEMBER",
      balance: 0,
    },
    select: {
      id: true,
      name: true,
      loginNumber: true,
      role: true,
      monthlyAllocation: true,
      balance: true,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
