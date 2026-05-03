## Why

團隊目前以人工方式追蹤成員經費使用，管理者需逐一核對每人餘額、成員也難以即時確認自己的剩餘可用金額，行政負擔高且容易出錯。本工具將這套流程數位化，讓管理者與成員各自在系統中完成所需操作。

**後續補強（討論收斂）**：管理者後臺需與總覽一致的導覽；管理者須能登錄**自己的**支出（沿用既有 `POST /api/expenses`，扣管理者帳上餘額）；總覽需顯示**所有使用者餘額加總**之團隊剩餘；成員餘額列上對透支者顯示「需補發經費」標籤；並支援對透支**成員**記錄核銷／補發決策、留存紀錄並於同意補發時加回該成員餘額。

## What Changes

- 建立 Next.js 網頁應用，提供管理者與一般成員兩種角色的操作介面
- 管理者可新增成員帳號、設定各人每月固定分配金額，並在總覽查看所有成員支出記錄（含登記人資訊）與整體經費狀況
- 一般成員可登錄支出記錄（含收據上傳），並查看自己的每月記錄與剩餘餘額
- 系統於每月一日自動將分配金額加入各成員餘額，月底剩餘自動累積至下月
- **（增量）** 成員帳號管理頁與管理者總覽共用頂部導覽，可返回總覽
- **（增量）** 管理者於後臺（以總覽為主）使用與成員相同的支出登錄流程，登錄**管理者本人**之支出
- **（增量）** 管理者總覽顯示「團隊剩餘餘額累計」＝所有 `User.balance`（含 MANAGER）之和；與既有當月支出統計並列且文案區隔
- **（增量）** 成員餘額摘要列：當該列 `balance < 0` 時顯示「需補發經費」標籤（沿用紅字等既有負值樣式）
- **（增量）** 當成員餘額為負時，管理者可記錄是否核銷補發；系統持久化每一筆決策；若選擇補發則以指定金額原子加回該成員 `balance`（支出列仍不可改刪）

## Non-Goals (optional)

- 不支援多團隊：本工具為單一團隊設計，一個部署實例對應一個團隊
- 不支援支出審核流程：成員送出記錄後即時生效，無需管理者批准
- 不支援成員自行註冊：帳號統一由管理者建立

## Capabilities

### New Capabilities

- `user-auth`: 帳號認證與管理——登入號碼 + 密碼登入、角色區分（管理者 / 一般成員）、管理者建立與管理成員帳號
- `budget-allocation`: 經費分配管理——管理者設定每人每月固定分配金額、系統月初自動發放、餘額跨月累積
- `expense-record`: 支出記錄——成員登錄支出（金額、日期、說明、收據圖片）、即時扣款、記錄不可刪除修改
- `manager-overview`: 管理者總覽——查看所有成員每月支出記錄（含登記人欄位）、各人剩餘餘額、整體支出統計
- `member-dashboard`: 成員儀表板——查看自己的每月支出記錄與剩餘餘額，無法存取其他成員資料
- `balance-reimbursement`: 透支成員之核銷／補發決策——管理者記錄是否補發、審計紀錄、同意時加回餘額

### Modified Capabilities

- `manager-overview`: 擴充——與成員管理頁一致的導覽；團隊餘額加總顯示；成員列「需補發經費」標籤；管理者於總覽登錄自身支出之介面

## Impact

- Affected specs: user-auth, budget-allocation, expense-record, manager-overview, member-dashboard、**balance-reimbursement（新增）**
- Affected code:
  - New: src/app（Next.js App Router 前端頁面）
  - New: src/app/api（Next.js API routes 後端邏輯）
  - New: src/lib（共用工具、Prisma client）
  - New: prisma/schema.prisma（資料庫 schema）
  - New: package.json、next.config.ts（專案設定）
  - **（增量）** `src/app/admin/members/page.tsx`、`src/app/admin/overview/page.tsx`、`src/app/components/ExpenseForm.tsx`（或重用方式）
  - **（增量）** 新 API route：成員核銷／補發決策（例如 `src/app/api/admin/members/[id]/reimbursement/route.ts` 或專用 resource 名稱）
  - **（增量）** Prisma 新增核銷／補發決策（審計）模型與 migration
