## Why

一般成員儀表板目前僅顯示帳本「目前餘額」與依月份篩選的支出列表，無法對照「設定之每月固定經費」「歷史月配實際入帳加總」「累計總支出」與「核銷／補發」紀錄。成員難以與管理者使用之語彙對齊，也不易理解可用額度與補發歷程。

## What Changes

- 於成員儀表板（`/dashboard`）顯示三項指標：**每月固定經費**（使用者設定之 `monthlyAllocation`）、**總支出**（該成員所有 `ExpenseRecord` 金額加總）、**可用餘額**（該成員所有 `MonthlyAllocationLog` 之 `amount` 加總減去總支出）。
- 於成員儀表板新增 **核銷／補發紀錄** 區塊：表格欄位與管理者總覽頁「核銷／補發紀錄」一致（含管理者名稱、是否補發、補發金額、備註、建立時間等同等資訊），且僅列出 `targetUserId` 為目前登入成員之 `ReimbursementDecision` 列。
- 提供成員角色可呼叫之後端 API，回傳上述聚合數字與紀錄；維持 MEMBER 不得讀取其他成員之聚合或紀錄。

## Non-Goals

- 不變更月配排程、手動補發、核銷寫入之既有商業規則與資料表結構。
- 不在本變更內強制將「可用餘額」與資料庫 `User.balance` 對齊或隱藏帳本餘額；若產品後續決定並列或取代顯示，可另案處理。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `member-dashboard`: 新增成員預算摘要（月配設定、歷史入帳加總、總支出、可用餘額）與本人核銷／補發紀錄之需求與情境。

## Impact

- Affected specs: `openspec/specs/member-dashboard/spec.md`（以本變更之 delta 擴充）
- Affected code:
  - Modified: `src/app/dashboard/page.tsx`
  - Modified 或 New: `src/app/api/auth/me/route.ts`，或新增例如 `src/app/api/member/summary/route.ts`（或等價路徑）以回傳聚合；以及例如 `src/app/api/member/reimbursements/route.ts` 以回傳本人 `ReimbursementDecision` 列表
  - Modified（若採擴充 me）: 僅限增加欄位時之型別與前端取用
  - Removed: （無）
