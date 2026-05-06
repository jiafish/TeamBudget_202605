## Why

成員管理頁缺乏核心管理功能（刪除成員、對所有角色重設密碼），而「設定分配」功能錯置於總覽頁，導致管理動線分散且操作不直覺。現階段也無法在設定視窗中查閱既有分配歷史，管理者難以追蹤設定變更。

## What Changes

- 「設定分配」按鈕及 Modal 從總覽頁（`成員餘額摘要`區塊）移至成員管理頁的成員列表
- 設定分配 Modal 頂端顯示最近一筆分配設定（金額、起訖月）；點開時懶載入完整歷史，方便管理者查閱並變更
- 新增刪除成員功能（軟刪除：`User` 加 `deletedAt` 欄位），被刪除帳號登入時回傳「帳號已停用」錯誤，所有查詢自動過濾已刪除成員
- 重設密碼功能開放給所有角色（含管理者本人），移除前端的角色限制判斷

## Non-Goals

- 不實作「還原已刪除成員」功能（無 undelete UI，資料僅保留於資料庫）
- 不實作硬刪除（所有關聯歷史記錄完整保留）
- 不做成員角色升降管理（如將 MEMBER 升為 MANAGER）

## Capabilities

### New Capabilities

- `member-soft-delete`: 成員軟刪除，包含 schema 遷移、API 端點、登入封鎖與所有查詢過濾

### Modified Capabilities

- `budget-allocation`: 設定分配 UI 搬移至成員管理頁，新增懶載入歷史查詢端點
- `user-auth`: 登入時檢查 `deletedAt`，封鎖已停用帳號
- `manager-overview`: 總覽頁移除「設定分配」按鈕及相關 state

## Impact

- Affected specs: `member-soft-delete`（新增）、`budget-allocation`（修改）、`user-auth`（修改）、`manager-overview`（修改）
- Affected code:
  - New: `src/app/api/admin/members/[id]/route.ts`（DELETE 軟刪除端點）、`src/app/api/admin/members/[id]/allocation-history/route.ts`（GET 歷史查詢）
  - Modified: `prisma/schema.prisma`、`src/app/api/admin/members/route.ts`、`src/app/api/auth/login/route.ts`、`src/app/api/admin/summary/route.ts`、`src/app/api/cron/monthly-allocation/route.ts`、`src/app/admin/members/page.tsx`、`src/app/admin/overview/page.tsx`
  - Removed: （無）
