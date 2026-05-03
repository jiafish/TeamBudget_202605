import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session || !requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const targetId = parseInt((await params).id, 10);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json({ error: "無效的成員編號" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reimbursed = Boolean(body?.reimbursed);
  const creditAmount = Number(body?.creditAmount ?? 0);
  const noteRaw = body?.note;
  const note =
    typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) || null : null;

  if (!reimbursed && creditAmount !== 0) {
    return NextResponse.json(
      { error: "未補發時補發金額必須為 0" },
      { status: 400 }
    );
  }

  if (reimbursed && (!Number.isInteger(creditAmount) || creditAmount <= 0)) {
    return NextResponse.json(
      { error: "補發時金額必須為正整數" },
      { status: 400 }
    );
  }

  try {
    const row = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: targetId } });
      if (!target || target.role !== "MEMBER") {
        throw new Error("FORBIDDEN_TARGET");
      }

      const expSum = await tx.expenseRecord.aggregate({
        where: { userId: targetId },
        _sum: { amount: true },
      });
      const totalExpense = expSum._sum.amount ?? 0;
      const displayRemaining = target.monthlyAllocation - totalExpense;

      if (displayRemaining >= 0) {
        throw new Error("NOT_NEGATIVE");
      }
      const maxCredit = -displayRemaining;
      if (reimbursed && creditAmount > maxCredit) {
        throw new Error("CREDIT_TOO_HIGH");
      }

      const created = await tx.reimbursementDecision.create({
        data: {
          targetUserId: targetId,
          managerUserId: session.userId,
          reimbursed,
          creditAmount: reimbursed ? creditAmount : 0,
          note,
        },
      });

      if (reimbursed) {
        await tx.user.update({
          where: { id: targetId },
          data: { balance: { increment: creditAmount } },
        });
      }

      return created;
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN_TARGET") {
      return NextResponse.json({ error: "僅可對一般成員操作" }, { status: 403 });
    }
    if (msg === "NOT_NEGATIVE") {
      return NextResponse.json(
        { error: "僅可在月分配減支出後餘額為負時記錄核銷／補發" },
        { status: 400 }
      );
    }
    if (msg === "CREDIT_TOO_HIGH") {
      return NextResponse.json(
        { error: "補發金額不可超過目前透支額（依月分配與累計支出計算）" },
        { status: 400 }
      );
    }
    throw e;
  }
}
