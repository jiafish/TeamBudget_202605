## Context

管理者總覽目前依資料庫 `User.balance` 顯示成員與團隊加總；手動補發區塊為依月份觸發之排程式入帳（`runMonthlyAllocation`）。產品需求改為以「月分配設定值對照累計支出」呈現總覽餘額，並以指定對象與金額完成補發，且紀錄須與既有核銷／補發列表一致。支出登錄與 `balance` 扣款之行為仍為成員／管理者儀表板所依賴。

## Goals / Non-Goals

**Goals:**

- 總覽 API 或頁面能取得每位使用者之累計支出與團隊聚合，並以「月分配 − 累計支出」呈現成員列與團隊加總（與 proposal 一致）。
- 提供新的管理者專用補發端點（或等價路徑）：指定 `targetUserId`、正整數 `creditAmount`、選填 `note`，於單一交易中建立 `ReimbursementDecision`（`reimbursed=true`）並將目標使用者 `balance` 加上 `creditAmount`。
- 總覽首屏指標、頁籤資訊架構與「需補發／管理者支出」之互動，以 **Ingest 後追加** 小節與下方決策為準（已實作之首版 UI 若與 ingest 衝突，以 ingest 為後續修正依據）。

**Ingest 後追加（尚未完全反映於已 merge 之程式碼者，以下列為準）：**

- 總覽指標列改為 **團隊總支出**（全歷史 `ExpenseRecord` 金額加總，即 summary 之 `sumTotalExpense`）與 **團隊剩餘餘額累計**；**不**在指標列放依月份之當月總支出。
- 成員餘額摘要下方以 **頁籤** 組織其餘內容：**月份支出統計**（內含月份選擇、該月合計、支出記錄）、**核銷補發**（手動補發表單＋紀錄表）、**登錄支出**（管理者本人支出表單）。
- 點擊「需補發經費」時，先切換至「核銷補發」頁籤，再捲動至手動補發區並預選成員。

**Non-Goals:**

- 不重寫成員儀表板之「目前餘額」語意（仍可使用 DB `balance`）。
- 不刪除 `POST /api/admin/allocation/trigger`（供 cron／維運），除非後續 change 明確廢止。

## Decisions

### 以 API 聚合支應總覽公式，避免前端多次查詢

在 `src/app/api/admin/summary/route.ts`（或等價檔案）以資料庫聚合（例如 `groupBy`／子查詢）回傳每位使用者 `totalExpense`、`monthlyAllocation`，並由伺服器或前端導出 `displayRemaining = monthlyAllocation - totalExpense` 與團隊加總。理由：單一請求、數字一致、減少競態。

### 手動補發沿用 `ReimbursementDecision` 資料表

新端點寫入與既有核銷／補發相同之資料列，使 `GET /api/admin/reimbursements` 無需變更即可列出手動補發。理由：零新表、列表自然合併。

### 手動補發允許目標為 MANAGER 或 MEMBER，且不強制負餘額

與「透支補發」分流：舊有 `POST /api/admin/members/:id/reimbursement` 規則可保留給核銷流程；新手動補發端點不檢查 `balance < 0`。理由：符合使用者指定對象與金額之補發場景。

### 需補發判斷改對齊顯示用餘額

`需補發經費` 標籤與樣式以 `displayRemaining < 0` 為準，而非僅 `User.balance < 0`。理由：與摘要表欄位一致，避免認知落差。

### 團隊總支出（全歷史）置於指標列；月份選擇僅在「月份支出統計」頁籤

指標列顯示之「團隊總支出」為 **全歷史支出加總**（與 `totals.sumTotalExpense` 一致），與「團隊剩餘餘額累計」並列，二者皆與所選統計月份無關。可選月份僅出現在「月份支出統計」頁籤內，用以驅動 `GET /api/admin/expenses?month=` 與該月小計／明細。理由：區分「累積財務口徑」與「期間分析口徑」，降低首屏認知負擔。

### （取代舊決策）團隊當月總支出與月份選擇共用狀態

此決策由上一節取代：首屏不再綁定當月支出；月份狀態僅綁定「月份支出統計」頁籤。

## Risks / Trade-offs

[顯示餘額與 DB `balance` 可能短期不一致] → 於總覽文案簡述兩者定義差異；成員儀表板仍顯示帳本餘額。

[手動補發入帳不改變「月分配 − 支出」顯示值] → 若未來要求補發反映於總覽公式，需另開 change 擴充公式或同步調整 `monthlyAllocation`／虛擬額度模型。

## Migration Plan

無資料遷移。上線後管理者可立即使用新表單；舊月份觸發按鈕自 UI 移除不影響已入帳資料。

## Open Questions

無。若利害關係人要求補發必須拉高總覽顯示餘額，於後續 ingest／新 change 將公式調整為納入補發加總。
