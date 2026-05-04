import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** YYYY-MM in local calendar, matching `src/app/api/cron/monthly-allocation/route.ts`. */
export function formatYearMonthLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive list of YYYY-MM from `from` month through `to` month (local calendar). */
export function listMonthsInclusiveLocal(from: Date, to: Date): string[] {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatYearMonthLocal(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

/** True if `s` is a valid calendar month string `YYYY-MM` (01–12). */
export function isValidYearMonth(s: string): boolean {
  const m = YEAR_MONTH_RE.exec(s);
  if (!m) return false;
  const monthNum = Number(m[2]);
  return monthNum >= 1 && monthNum <= 12;
}

function firstDayOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function maxYearMonth(a: string, b: string): string {
  return a >= b ? a : b;
}

function minYearMonth(a: string, b: string): string {
  return a <= b ? a : b;
}

function parseYearMonthStartLocal(ym: string): Date {
  const m = YEAR_MONTH_RE.exec(ym);
  if (!m) throw new Error(`invalid YYYY-MM: ${ym}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

export type BackfillMonthRange = { fromMonth: string; toMonth: string };

export type BackfillAllocationResult = {
  backfilledMonths: number;
  effectiveBackfillFromMonth: string | null;
  effectiveBackfillToMonth: string | null;
};

/**
 * For each calendar month in the effective backfill window, if no
 * MonthlyAllocationLog exists, credits `creditedAmount` to balance and creates
 * the log. Idempotent per month (unique userId_month).
 *
 * When `range` is omitted, the window is the member's account creation month
 * through the current local month (same as before). When `range` is set, the
 * window is the intersection of that range with the creation-through-current
 * window (caller's responsibility to pass a validated inclusive pair).
 *
 * Past calendar months inside that intersection therefore receive
 * `MonthlyAllocationLog` rows when missing, and lifetime log sums used in
 * balance summaries include those months once created.
 */
export async function backfillAllocationLogsForMember(
  memberId: number,
  creditedAmount: number,
  range?: BackfillMonthRange | null
): Promise<BackfillAllocationResult> {
  if (!Number.isInteger(creditedAmount) || creditedAmount <= 0) {
    return {
      backfilledMonths: 0,
      effectiveBackfillFromMonth: null,
      effectiveBackfillToMonth: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: memberId },
    select: { createdAt: true },
  });
  if (!user) {
    return {
      backfilledMonths: 0,
      effectiveBackfillFromMonth: null,
      effectiveBackfillToMonth: null,
    };
  }

  const now = new Date();
  const creationStr = formatYearMonthLocal(firstDayOfMonthLocal(user.createdAt));
  const currentStr = formatYearMonthLocal(firstDayOfMonthLocal(now));

  let months: string[];
  if (range) {
    const effFrom = maxYearMonth(creationStr, range.fromMonth);
    const effTo = minYearMonth(currentStr, range.toMonth);
    if (effFrom > effTo) {
      months = [];
    } else {
      months = listMonthsInclusiveLocal(
        parseYearMonthStartLocal(effFrom),
        parseYearMonthStartLocal(effTo)
      );
    }
  } else {
    months = listMonthsInclusiveLocal(user.createdAt, now);
  }

  const effectiveBackfillFromMonth =
    months.length > 0 ? months[0]! : null;
  const effectiveBackfillToMonth =
    months.length > 0 ? months[months.length - 1]! : null;

  let backfilledMonths = 0;

  for (const month of months) {
    const existing = await prisma.monthlyAllocationLog.findUnique({
      where: { userId_month: { userId: memberId, month } },
    });
    if (existing) continue;

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: memberId },
          data: { balance: { increment: creditedAmount } },
        }),
        prisma.monthlyAllocationLog.create({
          data: { userId: memberId, amount: creditedAmount, month },
        }),
      ]);
      backfilledMonths++;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        continue;
      }
      throw e;
    }
  }

  return {
    backfilledMonths,
    effectiveBackfillFromMonth,
    effectiveBackfillToMonth,
  };
}

export async function runMonthlyAllocation(month: string): Promise<{
  processed: number;
  skipped: number;
}> {
  const users = await prisma.user.findMany({
    where: { monthlyAllocation: { gt: 0 } },
  });

  let processed = 0;
  let skipped = 0;

  for (const user of users) {
    const existing = await prisma.monthlyAllocationLog.findUnique({
      where: { userId_month: { userId: user.id, month } },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Atomic balance increment + log creation in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: user.monthlyAllocation } },
      }),
      prisma.monthlyAllocationLog.create({
        data: { userId: user.id, amount: user.monthlyAllocation, month },
      }),
    ]);

    processed++;
  }

  return { processed, skipped };
}
