-- CreateTable
CREATE TABLE "MemberAllocationSettingLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberUserId" INTEGER NOT NULL,
    "managerUserId" INTEGER NOT NULL,
    "monthlyAllocationAfter" INTEGER NOT NULL,
    "requestedBackfillFromMonth" TEXT,
    "requestedBackfillToMonth" TEXT,
    "effectiveBackfillFromMonth" TEXT,
    "effectiveBackfillToMonth" TEXT,
    "backfilledMonthsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemberAllocationSettingLog_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberAllocationSettingLog_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MemberAllocationSettingLog_memberUserId_createdAt_idx" ON "MemberAllocationSettingLog"("memberUserId", "createdAt");
