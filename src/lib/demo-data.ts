export const DEMO_USERS = [
  {
    id: 0,
    name: "管理員",
    loginNumber: "admin",
    role: "MANAGER" as const,
    monthlyAllocation: 0,
    balance: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  },
  {
    id: 1,
    name: "測試成員",
    loginNumber: "member01",
    role: "MEMBER" as const,
    monthlyAllocation: 3000,
    balance: 1500,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  },
];

export const DEMO_CATEGORIES = [
  { id: 1, name: "餐費", createdAt: new Date("2026-01-01T00:00:00.000Z") },
  { id: 2, name: "交通費", createdAt: new Date("2026-01-01T00:00:00.000Z") },
];

export const DEMO_EXPENSES = [
  {
    id: 1,
    userId: 1,
    amount: 450,
    date: new Date("2026-05-01T12:00:00.000Z"),
    description: "團隊午餐",
    receiptPath: null,
    categoryId: 1,
    category: { id: 1, name: "餐費" },
    createdAt: new Date("2026-05-01T12:00:00.000Z"),
  },
  {
    id: 2,
    userId: 1,
    amount: 120,
    date: new Date("2026-04-15T09:00:00.000Z"),
    description: "捷運月票",
    receiptPath: null,
    categoryId: 2,
    category: { id: 2, name: "交通費" },
    createdAt: new Date("2026-04-15T09:00:00.000Z"),
  },
  {
    id: 3,
    userId: 1,
    amount: 380,
    date: new Date("2026-03-20T18:30:00.000Z"),
    description: "客戶餐敘",
    receiptPath: null,
    categoryId: 1,
    category: { id: 1, name: "餐費" },
    createdAt: new Date("2026-03-20T18:30:00.000Z"),
  },
];

export const DEMO_BUDGET_SUMMARY = {
  monthlyAllocation: 3000,
  totalAllocatedFromLogs: 9000,
  totalSupplementCreditsReimbursed: 0,
  totalAllocationAndSupplements: 9000,
  totalExpenseAllTime: 950,
  availableAfterAllocationsAndSupplements: 8050,
  availableFromAllocations: 8050,
  lastAllocationSetting: null,
};

export const DEMO_MEMBER_REIMBURSEMENTS = [
  {
    id: 1,
    targetUserId: 1,
    targetName: "測試成員",
    managerUserId: 0,
    managerName: "管理員",
    reimbursed: true,
    creditAmount: 500,
    note: "四月差旅補發",
    createdAt: "2026-04-30T10:00:00.000Z",
  },
];
