import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEMO_EXPENSES } from "@/lib/demo-data";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month");

  // MEMBER can only query own data (task 6.2 / Member cannot access other members' data)
  const requestedUserId = searchParams.get("userId")
    ? parseInt(searchParams.get("userId")!)
    : session.userId;

  if (session.role !== "MANAGER" && requestedUserId !== session.userId) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const now = new Date();
  const month =
    monthParam ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "月份格式必須為 YYYY-MM" }, { status: 400 });
  }

  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  if (process.env.DEMO_MODE === "true") {
    const records = DEMO_EXPENSES.filter(
      (e) =>
        e.userId === requestedUserId &&
        e.date >= start &&
        e.date < end
    );
    return NextResponse.json(records);
  }

  const records = await prisma.expenseRecord.findMany({
    where: {
      userId: requestedUserId,
      date: { gte: start, lt: end },
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      userId: true,
      amount: true,
      date: true,
      description: true,
      receiptPath: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
    },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.json({ ok: true, demo: true });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let amount: number;
  let date: Date;
  let description: string;
  let receiptPath: string | null = null;
  let categoryId: number | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    amount = Number(formData.get("amount"));
    const dateStr = String(formData.get("date") ?? "");
    description = String(formData.get("description") ?? "").trim();
    date = new Date(dateStr);
    const catRaw = formData.get("categoryId");
    if (catRaw && String(catRaw).trim() !== "") {
      categoryId = parseInt(String(catRaw));
    }

    const file = formData.get("receipt") as File | null;
    if (file && file.size > 0) {
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "收據檔案不能超過 10 MB" },
          { status: 400 }
        );
      }
      const ext = ALLOWED_TYPES[file.type];
      if (!ext) {
        return NextResponse.json(
          { error: "收據僅支援 JPEG、PNG、WebP 格式" },
          { status: 400 }
        );
      }
      const filename = `${session.userId}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
      const uploadDir = path.join(process.cwd(), "uploads", "receipts");
      await mkdir(uploadDir, { recursive: true });
      const bytes = await file.arrayBuffer();
      await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
      receiptPath = filename;
    }
  } else {
    const body = await req.json().catch(() => null);
    amount = Number(body?.amount);
    description = String(body?.description ?? "").trim();
    date = new Date(String(body?.date ?? ""));
    if (body?.categoryId != null && body.categoryId !== "") {
      categoryId = parseInt(String(body.categoryId));
    }
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "金額必須為正整數" },
      { status: 400 }
    );
  }
  if (!description) {
    return NextResponse.json({ error: "說明不能為空" }, { status: 400 });
  }
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "日期格式無效" }, { status: 400 });
  }

  if (categoryId !== null) {
    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "無效的類別 ID" }, { status: 400 });
    }
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "類別不存在" }, { status: 400 });
    }
  }

  // Atomic: create record + decrement balance
  const [record] = await prisma.$transaction([
    prisma.expenseRecord.create({
      data: {
        userId: session.userId,
        amount,
        date,
        description,
        receiptPath,
        categoryId,
      },
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.user.update({
      where: { id: session.userId },
      data: { balance: { decrement: amount } },
    }),
  ]);

  return NextResponse.json(record, { status: 201 });
}

// No PUT or DELETE — expenses are immutable
export async function PUT() {
  return NextResponse.json({ error: "禁止操作" }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({ error: "禁止操作" }, { status: 403 });
}
