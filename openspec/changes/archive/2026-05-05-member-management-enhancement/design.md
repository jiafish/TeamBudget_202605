## Context

目前成員管理頁（`src/app/admin/members/page.tsx`）僅支援新增成員與對非管理者重設密碼，缺乏刪除成員及管理者密碼重設功能。「設定分配」按鈕與 Modal 錯置於總覽頁的「成員餘額摘要」區塊（`src/app/admin/overview/page.tsx`），分配設定視窗也不顯示既有歷史，管理者無法在設定時查閱過去配置。

Schema 層面：`User` 模型無 `deletedAt` 欄位，目前無任何軟刪除機制。登入路由（`src/app/api/auth/login/route.ts`）只驗證帳號密碼，不檢查帳號是否停用。

## Goals / Non-Goals

**Goals:**

- 軟刪除成員：新增 `deletedAt` 欄位並在所有成員查詢、登入、月配 Cron 中過濾已刪除帳號
- 新 DELETE endpoint：`DELETE /api/admin/members/[id]`，設定 `deletedAt`，拒絕刪除自己或最後一位管理者
- 設定分配 UI 搬移：將按鈕與 Modal 從總覽頁移至成員管理頁
- 新 GET endpoint：`GET /api/admin/members/[id]/allocation-history`，懶載入分配歷史
- 重設密碼開放所有角色：移除前端 `m.role !== "MANAGER"` 判斷

**Non-Goals:**

- 不實作 undelete（無還原 UI）
- 不實作硬刪除
- 不做角色升降（MEMBER ↔ MANAGER）
- 不修改成員的現有支出或分配紀錄（刪除後資料保留，僅帳號停用）

## Decisions

### 軟刪除欄位與過濾策略

`User` 新增 `deletedAt DateTime?`，預設 `null`（未刪除）。

所有需要「取得有效成員」的查詢加上 `where: { deletedAt: null }`：
- `GET /api/admin/members`
- `GET /api/admin/summary`
- `GET /api/cron/monthly-allocation`
- 登入：`findUnique by loginNumber` 後檢查 `deletedAt`，非 null 則回傳 HTTP 401，錯誤訊息「帳號已停用」

已刪成員的 `ExpenseRecord`、`MonthlyAllocationLog`、`ReimbursementDecision`、`MemberAllocationSettingLog` 全部保留，歷史稽核完整。

MemberAllocationSettingLog 的 `manager` relation 仍可能指向已刪除管理者，查詢時不過濾，讓歷史完整保留管理者名稱。

**捨棄方案**：硬刪除需要處理所有 FK 關聯（cascade 或手動刪除），SQLite 預設不啟用 FK，但 Prisma 遇到 relation 約束仍會拋錯；且歷史資料將永久消失，不符合審計需求。

### DELETE /api/admin/members/[id] 保護規則

執行軟刪除前驗證：
1. 目標 ID 不得等於當前登入管理者 ID（不能刪自己）→ HTTP 400
2. 目標為 MANAGER 且系統目前 MANAGER 數量（`deletedAt: null`）等於 1 → HTTP 400，回傳「無法刪除唯一的管理者」

通過驗證後執行 `prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })`。

### 分配歷史懶載入 — 獨立 GET endpoint

新增 `GET /api/admin/members/[id]/allocation-history`，回傳最近 50 筆 `MemberAllocationSettingLog`（依 `createdAt DESC`）。

Modal 在「設定分配」按鈕點擊時才發出此請求，非成員列表載入時一次全抓。

**捨棄方案**：在 `GET /api/admin/members` 內嵌歷史資料 — 成員人數多時每人帶 50 筆歷史會讓列表回應過大；或呼叫 `/api/admin/summary` — 該 endpoint 有額外聚合計算成本。

### 設定分配 Modal 搬移

Modal 對應的所有 React state（`editAllocationId`、`allocationInput`、`allocationBackfillFrom`、`allocationBackfillTo`、`allocationError`、`allocationFeedback`、`allocationHistory`）及 handler（`handleSetAllocation`）從 `overview/page.tsx` 移入 `members/page.tsx`。

Overview 頁移除「設定分配」按鈕及對應 state，不再顯示稽核記錄展開列（`openAllocationAudits`）。Overview 的「成員餘額摘要」表格操作欄僅保留「稽核紀錄」展開按鈕。

Modal 頂端新增「目前設定」區塊：顯示 `allocationHistory[0]`（最近一筆）的月分配金額、請求起迄月，方便管理者查閱後決定是否修改。

## Risks / Trade-offs

- **[風險] Prisma Migration 需要搭配 `prisma migrate dev` / `migrate deploy`**：本地開發須重新執行遷移，生產環境部署前須執行 `prisma migrate deploy`。緩解：README 已有遷移指引，在 tasks 中明確列出步驟。
- **[取捨] 軟刪除後 `User.balance` 不歸零**：帳號停用但餘額仍存在 DB，若未來實作報表，需在彙總時過濾 `deletedAt`。已在本次變更中處理 summary 與 cron 的過濾，其餘尚未使用 balance 的地方風險低。
- **[風險] 歷史稽核中管理者名稱可能「空白」**：`MemberAllocationSettingLog` 關聯的 manager 可能被軟刪除，Prisma 關聯查詢仍能取得 `manager.name`（資料保留），不影響顯示。

## Migration Plan

1. 執行 Prisma migration 新增 `User.deletedAt`
2. 部署新 API endpoints（DELETE、GET allocation-history）
3. 部署更新後的前端（members 頁加功能、overview 頁移除按鈕）
4. 無需資料補填（所有現有使用者 `deletedAt` 預設 `null`）

**Rollback**：回退程式碼後，`deletedAt` 欄位若為 `null` 不影響既有查詢（加 filter 後行為與之前相同）；若已有 `deletedAt` 非 null 的資料，回退後那些帳號仍可登入（需人工確認）。
