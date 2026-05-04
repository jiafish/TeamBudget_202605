import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import {
  backfillAllocationLogsForMember,
  isValidYearMonth,
  type BackfillMonthRange,
} from "@/lib/allocation";
import { prisma } from "@/lib/prisma";

function parseBackfillRange(body: Record<string, unknown>): {
  ok: true;
  range: BackfillMonthRange | undefined;
} | { ok: false; error: string } {
  const hasFrom = Object.prototype.hasOwnProperty.call(body, "backfillFromMonth");
  const hasTo = Object.prototype.hasOwnProperty.call(body, "backfillToMonth");
  if (hasFrom !== hasTo) {
    return { ok: false, error: "分配月份起迄須成對填寫或皆省略" };
  }
  if (!hasFrom) {
    return { ok: true, range: undefined };
  }
  const from = body.backfillFromMonth;
  const to = body.backfillToMonth;
  if (typeof from !== "string" || typeof to !== "string") {
    return { ok: false, error: "分配月份起迄格式無效" };
  }
  if (!isValidYearMonth(from) || !isValidYearMonth(to)) {
    return { ok: false, error: "分配月份須為 YYYY-MM（01–12 月）" };
  }
  if (from > to) {
    return { ok: false, error: "分配起月不可晚於分配迄月" };
  }
  return { ok: true, range: { fromMonth: from, toMonth: to } };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const { id } = await params;
  const memberId = parseInt(id);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "無效的成員 ID" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "無效的請求內容" }, { status: 400 });
  }

  const parsedRange = parseBackfillRange(body);
  if (!parsedRange.ok) {
    return NextResponse.json({ error: parsedRange.error }, { status: 400 });
  }

  const amount = Number(body.monthlyAllocation);
  if (!Number.isInteger(amount) || amount < 0) {
    return NextResponse.json(
      { error: "分配金額必須為 0 或正整數" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: memberId } });
  if (!user) {
    return NextResponse.json({ error: "成員不存在" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: memberId },
    data: { monthlyAllocation: amount },
    select: { id: true, name: true, monthlyAllocation: true },
  });

  let backfilledMonths = 0;
  let effectiveFrom: string | null = null;
  let effectiveTo: string | null = null;
  if (amount > 0) {
    const r = await backfillAllocationLogsForMember(
      memberId,
      amount,
      parsedRange.range
    );
    backfilledMonths = r.backfilledMonths;
    effectiveFrom = r.effectiveBackfillFromMonth;
    effectiveTo = r.effectiveBackfillToMonth;
  }

  const reqRange = parsedRange.range;
  try {
    await prisma.memberAllocationSettingLog.create({
      data: {
        memberUserId: memberId,
        managerUserId: session.userId,
        monthlyAllocationAfter: amount,
        requestedBackfillFromMonth: reqRange?.fromMonth ?? null,
        requestedBackfillToMonth: reqRange?.toMonth ?? null,
        effectiveBackfillFromMonth: amount > 0 ? effectiveFrom : null,
        effectiveBackfillToMonth: amount > 0 ? effectiveTo : null,
        backfilledMonthsCount: backfilledMonths,
      },
    });
  } catch {
    // 稽核表未 migration 或寫入失敗時，仍回傳月配更新結果
  }

  return NextResponse.json({ ...updated, backfilledMonths });
}
