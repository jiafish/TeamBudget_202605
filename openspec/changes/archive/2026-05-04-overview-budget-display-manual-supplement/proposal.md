## Why

管理者總覽目前的「餘額」與團隊加總依資料庫 `balance` 欄位呈現，與實務上「月分配額度對照支出」的檢視方式不一致；手動補發僅能依月份觸發排程式入帳，無法指定對象與金額，且與核銷紀錄的整合不足。本次變更統一總覽上的餘額定義、補發登錄方式與版面，讓管理者能依規則快速判讀並完成補發。

## What Changes

- 成員餘額摘要表之「目前餘額」改為依公式呈現：該成員之月分配金額減去該成員之支出總額（支出為該使用者名下所有支出紀錄金額加總；若需與已入帳補發一致，於設計中釐清是否併入已核銷補發金額）。
- 「團隊剩餘餘額累計」改為：所有成員月分配金額加總，減去所有成員支出金額加總（與上述公式一致之團隊層級聚合）。
- 「手動補發經費」改為可選擇補發對象（使用者）與輸入補發金額（及選填備註），送出後寫入與核銷／補發相同之持久化紀錄並更新帳本餘額，且該筆紀錄必須出現在「核銷／補發紀錄」列表中。
- 管理者總覽介面調整（首版）：第一區塊曾規劃同屏顯示團隊當月總支出與團隊剩餘餘額累計等；**後續以「Ingest（對話補充）」小節為準**，改為指標列顯示團隊總支出（全歷史）與團隊剩餘餘額累計，其餘以頁籤區分。
- 移除或取代總覽頁面上僅依「月份」觸發之舊手動補發表單（若排程／API 仍保留供自動化，不刪除後端端點，僅調整管理者 UI 與規格描述）。

### Ingest（對話補充，後續實作／規格收斂）

- **總覽指標（首屏）**：移除「依月份之當月總支出」於指標列之呈現；改為顯示 **團隊總支出**＝全歷史支出加總（與 `GET /api/admin/summary` 之 `totals.sumTotalExpense` 一致），以及 **團隊剩餘餘額累計**（全員月分配加總減全歷史支出加總）。月份維度僅用於下方頁籤內之統計，不再綁在指標列。
- **頁籤區**：於「成員餘額摘要」表格下方新增三個頁籤——**月份支出統計**、**核銷補發**、**登錄支出**。
  - **月份支出統計**：內含可選「統計月份」、該月團隊總支出（依支出日期）、該月支出記錄列表（沿用 `GET /api/admin/expenses?month=`）。
  - **核銷補發**：內含手動補發經費表單與核銷／補發紀錄表。
  - **登錄支出**：內含管理者本人支出表單（`POST /api/expenses`）。
- **需補發經費**：點擊後須切換至「核銷補發」頁籤（若尚未選中），再捲動至手動補發表單並預選成員，避免表單在非使用中頁籤時無法捲動到可見區。

## Non-Goals (optional)

- 不變更成員儀表板 `/api/auth/me` 之 `balance` 語意與支出登錄 API 之扣款行為（除非設計為與顯示公式強制一致而另有決議）。
- 不要求一次重構 Prisma 模型或遷移歷史資料；優先以 API 聚合與 UI 呈現達成需求。

## Capabilities

### New Capabilities

（無；行為延伸自既有管理者總覽與核銷／補發能力。）

### Modified Capabilities

- `manager-overview`：總覽首屏指標、餘額摘要定義、區塊順序、需補發與手動補發之互動；ingest 後另含頁籤資訊架構、團隊總支出（全歷史）與指標列定義。
- `balance-reimbursement`：手動補發（指定對象與金額）之授權、驗證、交易原子性、與紀錄列表之一致性；必要時調整「僅於 DB balance 為負」之規則與新補發路徑之關係。

## Impact

- Affected specs: `openspec/specs/manager-overview/spec.md`、`openspec/specs/balance-reimbursement/spec.md`（以 delta 形式於本 change 內撰寫）。
- Affected code:
  - Modified: `src/app/admin/overview/page.tsx`、`src/app/api/admin/summary/route.ts`、`src/app/api/admin/members/[id]/reimbursement/route.ts`、`src/app/api/admin/reimbursements/route.ts`（若列表需區分類型則僅 UI）、`src/app/components/AdminHeader.tsx`（若導覽無需變更則不修改）
  - New: `src/app/api/admin/manual-supplement/route.ts`（或同等路徑之新 API，實際檔名依設計）
  - Removed: 無（舊月份觸發表單自總覽頁移除屬 UI 刪減，非刪除整支 API 檔案時可不列 Removed）
