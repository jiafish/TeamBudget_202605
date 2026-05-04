## 1. Schema Migration

<!-- spec: Manager soft-deletes a member account; 軟刪除欄位與過濾策略 -->
- [x] 1.1 [Manager soft-deletes a member account] 在 `prisma/schema.prisma` 的 `User` 模型新增欄位 `deletedAt DateTime?`（預設為 null，無需提供 `@default`）
- [x] 1.2 執行 `npx prisma migrate dev --name add-user-soft-delete` 產生遷移 SQL，確認 migration 檔案正確新增 `ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME`
- [x] 1.3 執行 `npx prisma generate` 更新 Prisma Client 型別

## 2. 後端：新增 DELETE 軟刪除端點

<!-- spec: Manager soft-deletes a member account; DELETE /api/admin/members/[id] 保護規則 -->
- [x] 2.1 [Manager soft-deletes a member account] 建立 `src/app/api/admin/members/[id]/route.ts`，實作 `DELETE` handler：
  - 驗證管理者 session（`requireRole(session, "MANAGER")`），未登入回 401，非管理者回 403
  - 解析路由參數 `id`，非整數回 400
  - 若 `id === session.userId`，回 400 `{ error: "不能刪除自己的帳號" }`
  - 查詢目標 user（含已刪除），不存在回 404
  - 若目標 role 為 `MANAGER`，查詢 `prisma.user.count({ where: { role: "MANAGER", deletedAt: null } })`；若 count <= 1，回 400 `{ error: "無法刪除唯一的管理者帳號" }`
  - 執行 `prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })`
  - 回 200 `{ ok: true }`

## 3. 後端：新增分配歷史查詢端點

<!-- spec: Manager views per-member allocation history; 分配歷史懶載入 — 獨立 get endpoint -->
- [x] 3.1 [Manager views per-member allocation history] 建立 `src/app/api/admin/members/[id]/allocation-history/route.ts`，實作 `GET` handler：
  - 驗證管理者 session，未登入回 401，非管理者回 403
  - 解析路由參數 `id`，非整數回 400
  - 查詢目標 user（`deletedAt: null`），不存在或已刪除回 404
  - 查詢 `prisma.memberAllocationSettingLog.findMany({ where: { memberUserId: id }, include: { manager: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 })`
  - 回 200，陣列每筆包含 `id`、`monthlyAllocationAfter`、`requestedBackfillFromMonth`、`requestedBackfillToMonth`、`effectiveBackfillFromMonth`、`effectiveBackfillToMonth`、`backfilledMonthsCount`、`createdAt`、`managerName`（取自 `manager.name`）

## 4. 後端：更新既有 API 過濾已刪除成員

<!-- spec: Manager views and manages member accounts; Manager views per-member balance summary; Soft-deleted account is blocked from login; Login with number and password; 軟刪除欄位與過濾策略 -->
- [x] 4.1 [Manager views and manages member accounts] 在 `src/app/api/admin/members/route.ts` 的 `GET` handler 中，`prisma.user.findMany` 加上 `where: { deletedAt: null }`
- [x] 4.2 [Soft-deleted account is blocked from login] [Login with number and password] 在 `src/app/api/auth/login/route.ts` 中，取得 user 後加判斷：若 `user.deletedAt !== null`，回 401 `{ error: "帳號已停用" }` 並不設 cookie
- [x] 4.3 [Manager views per-member balance summary] 在 `src/app/api/admin/summary/route.ts` 中，查詢 `User` 列表時加上 `deletedAt: null` 過濾條件，確保已刪成員不出現於成員餘額摘要或團隊指標計算
- [x] 4.4 在 `src/app/api/cron/monthly-allocation/route.ts` 中，`prisma.user.findMany` 加上 `deletedAt: null` 過濾，確保 Cron 不對已刪成員發放月配

## 5. 前端：成員管理頁新增刪除功能

<!-- spec: Manager soft-deletes a member account; Manager views and manages member accounts -->
- [x] 5.1 [Manager soft-deletes a member account] 在 `src/app/admin/members/page.tsx` 的 `Member` interface 確認已有必要欄位（`id`、`name`、`role`），如缺少則補上
- [x] 5.2 新增 state：`deleteTargetId: number | null`、`deleteError: string`、`deleteSubmitting: boolean`
- [x] 5.3 實作 `handleDelete` async function：向 `DELETE /api/admin/members/${deleteTargetId}` 發請求，成功則呼叫 `fetchMembers()`，失敗則設 `deleteError`，最後關閉確認 Modal
- [x] 5.4 在成員列表每行的操作欄新增「刪除」按鈕（紅色文字），點擊後設 `deleteTargetId = m.id`
- [x] 5.5 新增刪除確認 Modal（`deleteTargetId !== null` 時顯示）：顯示 `"確定刪除「{name}」嗎？此操作將停用該帳號，歷史記錄仍保留。"`，含「確認刪除」與「取消」按鈕；顯示 `deleteError`

## 6. 前端：成員管理頁移入「設定分配」功能

<!-- spec: Manager sets monthly allocation per member; Manager views per-member allocation history; 設定分配 Modal 搬移 -->
- [x] 6.1 [Manager sets monthly allocation per member] [Manager views per-member allocation history] 在 `src/app/admin/members/page.tsx` 新增 interface `AllocationHistoryRow`，欄位同 3.1 endpoint 回傳（`id`、`monthlyAllocationAfter`、`requestedBackfillFromMonth`、`requestedBackfillToMonth`、`effectiveBackfillFromMonth`、`effectiveBackfillToMonth`、`backfilledMonthsCount`、`createdAt`、`managerName`）
- [x] 6.2 新增 state：`editAllocationId: number | null`、`allocationInput: string`、`allocationBackfillFrom: string`、`allocationBackfillTo: string`、`allocationError: string | null`、`allocationFeedback: string | null`、`allocationHistory: AllocationHistoryRow[]`、`allocationHistoryLoading: boolean`
- [x] 6.3 實作 `openAllocationModal(member)` function：設 `editAllocationId = member.id`、`allocationInput = String(member.monthlyAllocation)`、`allocationBackfillFrom = ""`、`allocationBackfillTo = ""`、`allocationError = null`、`allocationHistory = []`、`allocationHistoryLoading = true`，然後 fetch `GET /api/admin/members/${member.id}/allocation-history`，將結果存入 `allocationHistory`，設 `allocationHistoryLoading = false`
- [x] 6.4 實作 `handleSetAllocation` async function（邏輯同 `overview/page.tsx` 現有的 `handleSetAllocation`）：驗證起迄需成對、組 payload、PUT `api/admin/members/${editAllocationId}/allocation`，成功則設 `allocationFeedback`（若有補帳月）、清空 state、呼叫 `fetchMembers()`；失敗則設 `allocationError`
- [x] 6.5 在成員列表每行的操作欄新增「設定分配」按鈕，點擊呼叫 `openAllocationModal(m)`
- [x] 6.6 新增設定分配 Modal（`editAllocationId !== null` 時顯示）：
  - 頂端「目前設定」區塊：若 `allocationHistoryLoading` 顯示「載入中…」；否則若 `allocationHistory.length > 0` 顯示最近一筆的 `monthlyAllocationAfter`（格式化為貨幣）及 `requestedBackfillFromMonth`～`requestedBackfillToMonth`（null 時顯示「—」）；若無歷史顯示「尚無設定紀錄」
  - 表單區：月分配金額輸入框（`allocationInput`）、分配起月（`allocationBackfillFrom`）、分配迄月（`allocationBackfillTo`）
  - 說明文字：「僅在起迄皆選定時才限制補帳區間；留空則自帳號建立月至本月補齊缺漏月配。」
  - `allocationError` 提示、「確認」與「取消」按鈕
- [x] 6.7 若 `allocationFeedback` 非 null，在頁面頂端顯示成功訊息橫幅（含「關閉」按鈕）

## 7. 前端：成員管理頁移除重設密碼角色限制

- [x] 7.1 在 `src/app/admin/members/page.tsx` 找到「重設密碼」按鈕的渲染條件 `{m.role !== "MANAGER" && (...)}` 並移除角色判斷，讓所有成員（含管理者）都顯示「重設密碼」按鈕

## 8. 前端：總覽頁移除「設定分配」相關元素

<!-- spec: Manager views per-member balance summary; 設定分配 Modal 搬移 -->
- [x] 8.1 在 `src/app/admin/overview/page.tsx` 移除「設定分配」按鈕（`成員餘額摘要`表格操作欄中的按鈕）
- [x] 8.2 在 `src/app/admin/overview/page.tsx` 移除設定分配 Modal（`{editAllocationId !== null && (...)}` 整個區塊）
- [x] 8.3 在 `src/app/admin/overview/page.tsx` 移除已無用的 state 宣告：`editAllocationId`、`allocationInput`、`allocationBackfillFrom`、`allocationBackfillTo`、`allocationError`、`allocationFeedback`
- [x] 8.4 在 `src/app/admin/overview/page.tsx` 移除已無用的 handler：`handleSetAllocation`
- [x] 8.5 確認 `openAllocationAudits`（稽核紀錄展開）及相關展開列仍保留於總覽頁，不受本次移除影響
