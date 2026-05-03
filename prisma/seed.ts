import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { loginNumber: "admin" },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
      data: {
        loginNumber: "admin",
        passwordHash,
        role: "MANAGER",
        name: "管理者",
        monthlyAllocation: 0,
        balance: 0,
      },
    });
    console.log("Seeded: MANAGER account (loginNumber=admin, password=admin123)");
  } else {
    console.log("Admin account already exists, skipping seed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
