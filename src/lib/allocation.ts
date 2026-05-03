import { prisma } from "@/lib/prisma";

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
