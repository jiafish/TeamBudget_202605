## Why

一般成員儀表板目前僅顯示帳本「目前餘額」與依月份篩選的支出列表，無法對照「設定之每月固定經費」「歷史月配實際入帳加總」「累計總支出」與「核銷／補發」紀錄。成員難以與管理者使用之語彙對齊，也不易理解可用額度與補發歷程。

## What Changes

- 於成員儀表板（`/dashboard`）顯示三項指標：**每月固定經費**（使用者設定之 `monthlyAllocation`）、**總支出**（該成員所有 `ExpenseRecord` 金額加總）、**可用餘額**（該成員所有 `MonthlyAllocationLog` 之 `amount` 加總減去總支出）。
- 於成員儀表板新增 **核銷／補發紀錄** 區塊：表格欄位與管理者總覽頁「核銷／補發紀錄」一致（含管理者名稱、是否補發、補發金額、備註、建立時間等同等資訊），且僅列出 `targetUserId` 為目前登入成員之 `ReimbursementDecision` 列。
- 提供成員角色可呼叫之後端 API，回傳上述聚合數字與紀錄；維持 MEMBER 不得讀取其他成員之聚合或紀錄。

（ingest）當管理者**設定或調整**成員之月分配金額（`monthlyAllocation`）時，系統應一併**補齊尚未入帳之分配月份**：在約定之曆月範圍內，對尚無 `MonthlyAllocationLog` 之月份建立入帳紀錄並增加該成員 `balance`，使成員端「每月分配經費加總」與實際應入帳月份一致（細節見 `design.md`）。

（ingest 2026）管理者於設定月分配金額時，可**選填**「分配月份起迄」（`YYYY-MM` 起、`YYYY-MM` 迄）：補帳僅發生在該閉區間與系統允許範圍（成員帳號建立曆月～伺服端當前曆月）之**交集**內；未帶起迄時維持既有「建立月～當月」預設行為。

（ingest 2026-b）每次管理者成功儲存月配設定時，系統應**持久化**該次請求之起迄（含未帶起迄時之「實際補帳區間」）、寫入之月配金額、補帳筆數與操作者等**稽核列**，供管理者於總覽確認各成員最近一次分配區間與狀況；成員端預算摘要之**主加總列**改為「**分配經費＋補發加總**」，計算為 `MonthlyAllocationLog.amount` 全期加總 **加上** 該成員作為目標且已入帳之補發（`ReimbursementDecision` 中 `reimbursed` 為 true 之 `creditAmount` 加總）；**可用餘額**改為該加總減去全期總支出，與使用者對「含補發之可用額」之理解一致。

## Non-Goals

- 不變更手動補發、核銷寫入之商業規則（`ReimbursementDecision` 等）。
- 不變更既有 `MonthlyAllocationLog` 之 `userId_month` 唯一約束與其語意；補帳仍僅建立缺漏月份之列。
- 不自動刪除或沖銷既有 `MonthlyAllocationLog`；僅補齊**缺漏**月份。
- **允許**新增專用之**月配設定稽核**資料表（或等價持久化結構）以保留起迄與操作紀錄；不強制修改 `User` 既有欄位語意。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `member-dashboard`: 新增成員預算摘要（月配設定、歷史入帳加總、總支出、可用餘額）與本人核銷／補發紀錄之需求與情境。
- `budget-allocation`: 管理者設定月分配金額時，補齊缺漏之分配月份與入帳紀錄（與 ingest 主題對齊）。
- `manager-overview`：總覽編輯月配表單之起迄與 API；並顯示各成員**最近一次**月配設定之起迄／實際補帳區間與時間（來自稽核列）。

## Impact

- Affected specs: `openspec/specs/member-dashboard/spec.md`（本變更 delta）、`openspec/specs/budget-allocation/spec.md`（本變更新增之 delta）
- Affected code:
  - Modified: `src/app/dashboard/page.tsx`
  - Modified 或 New: `src/app/api/auth/me/route.ts`，或新增例如 `src/app/api/member/summary/route.ts`（或等價路徑）以回傳聚合；以及例如 `src/app/api/member/reimbursements/route.ts` 以回傳本人 `ReimbursementDecision` 列表
  - Modified（若採擴充 me）: 僅限增加欄位時之型別與前端取用
  - Modified（ingest）: `src/app/api/admin/members/[id]/allocation/route.ts`，以及可複用或抽離之 `src/lib/allocation.ts`（補帳邏輯）
  - Modified（選擇性）: `src/app/admin/overview/page.tsx` 或 `src/app/admin/members/page.tsx` 若需提示已補帳月份
  - Modified（ingest 起迄）: `src/app/api/admin/members/[id]/allocation/route.ts` 請求體可選 `backfillFromMonth`／`backfillToMonth`；`src/lib/allocation.ts` 補帳函式接受曆月區間參數
  - Modified（ingest 起迄）: `src/app/admin/overview/page.tsx` 月配編輯 UI 增加起迄月份欄位（`type="month"` 或等價輸出 `YYYY-MM`）；成員列顯示最近一次分配起迄／實際區間
  - New: `prisma/schema.prisma` 月配設定稽核模型與 `prisma/migrations/` 新 migration；例如 `src/lib/member-allocation-setting-log.ts`（或併入 `src/lib/allocation.ts`）寫入稽核列之輔助函式
  - Modified: `src/app/api/member/budget-summary/route.ts`（加總含補發、可用餘額公式、可選回傳最近一次設定摘要）
  - Modified: `src/app/dashboard/page.tsx`（標籤「分配經費＋補發加總」與說明文案）
  - Modified: `src/app/api/admin/summary/route.ts`（各成員附帶最近一次月配稽核摘要）
  - Removed: （無）
