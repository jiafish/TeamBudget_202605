-- CreateTable
CREATE TABLE "ReimbursementDecision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetUserId" INTEGER NOT NULL,
    "managerUserId" INTEGER NOT NULL,
    "reimbursed" BOOLEAN NOT NULL,
    "creditAmount" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReimbursementDecision_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReimbursementDecision_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
