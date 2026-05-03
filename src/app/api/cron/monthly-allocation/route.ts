import { NextRequest, NextResponse } from "next/server";
import { runMonthlyAllocation } from "@/lib/allocation";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (
    !process.env.CRON_SECRET ||
    secret !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const result = await runMonthlyAllocation(month);

  return NextResponse.json({ ok: true, month, ...result });
}
