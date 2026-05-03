import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { runMonthlyAllocation } from "@/lib/allocation";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!requireRole(session, "MANAGER")) {
    return NextResponse.json({ error: "禁止存取" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const month = String(body?.month ?? "");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "月份格式必須為 YYYY-MM" },
      { status: 400 }
    );
  }

  const result = await runMonthlyAllocation(month);

  return NextResponse.json({ ok: true, month, ...result });
}
