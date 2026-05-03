import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetUserId = Number(body?.targetUserId);
  const creditAmount = Number(body?.creditAmount);
  const noteRaw = body?.note;
  const note =
    typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) || null : null;

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return NextResponse.json({ error: "無效的補發對象" }, { status: 400 });
  }

  if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
    return NextResponse.json(
      { error: "補發金額必須為正整數" },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: targetUserId } });
      if (!target) {
        throw new Error("NOT_FOUND");
      }
      if (target.role !== "MEMBER" && target.role !== "MANAGER") {
        throw new Error("BAD_ROLE");
      }

      const created = await tx.reimbursementDecision.create({
        data: {
          targetUserId,
          managerUserId: session.userId,
          reimbursed: true,
          creditAmount,
          note,
        },
      });

      await tx.user.update({
        where: { id: targetUserId },
        data: { balance: { increment: creditAmount } },
      });

      return created;
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
    }
    if (msg === "BAD_ROLE") {
      return NextResponse.json({ error: "不支援的帳號類型" }, { status: 400 });
    }
    throw e;
  }
}
