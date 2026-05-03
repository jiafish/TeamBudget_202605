## 1. 後端：總覽聚合與手動補發 API

- [x] 1.1 依設計「以 API 聚合支應總覽公式，避免前端多次查詢」擴充 `src/app/api/admin/summary/route.ts`，回傳每位使用者終身支出加總，並讓前端能計算「Manager views per-member balance summary」之顯示餘額（月分配減累計支出）與「Manager views team cumulative remaining balance」之團隊加總。
- [x] 1.2 實作「Manager records manual supplemental credit for a selected user」：依設計「手動補發沿用 `ReimbursementDecision` 資料表」，新增 MANAGER 專用端點（例如 `src/app/api/admin/manual-supplement/route.ts`），於單一交易中寫入 `ReimbursementDecision`（`reimbursed=true`）並將目標使用者 `balance` 加上金額；依「手動補發允許目標為 MANAGER 或 MEMBER，且不強制負餘額」驗證輸入。
- [x] 1.3 確認 `src/app/api/admin/reimbursements/route.ts` 符合「Manager views reimbursement decision history」：手動補發列與既有列並列、依建立時間新到舊，必要時補上 `note` 欄位於 JSON。

## 2. 前端：管理者總覽頁

- [x] 2.1 重構 `src/app/admin/overview/page.tsx` 第一區為「Manager overview dashboard hero shows monthly spend and team displayed balance」：與支出列表共用月份狀態（呼應設計「團隊當月總支出與月份選擇共用狀態」），顯示當月總支出與團隊顯示累計餘額。
- [x] 2.2 更新成員餘額摘要表以符合「Manager views per-member balance summary」與「Member balance summary shows reimbursement-needed label」：顯示欄位使用 API 聚合之公式餘額；依設計「需補發判斷改對齊顯示用餘額」套用紅字與標籤。
- [x] 2.3 實作「Manual supplemental credit form on admin overview」：目標使用者、金額、備註，成功後重新抓取 summary 與 reimbursements；移除舊的依月份觸發排程之總覽表單 UI。
- [x] 2.4 實作「Reimbursement-needed label focuses manual supplemental form」：點擊 `需補發經費` 捲動至手動補發表單並預選該成員。
- [x] 2.5 調整區塊順序以符合「Manager own expense section appears last in overview main content」：將「Manager submits own expense from admin overview」所用之支出表單區塊置於主欄最底（手動補發區塊之後）。

## 3. 核銷流程對齊（選配但建議）

- [x] 3.1 檢視 `src/app/api/admin/members/[id]/reimbursement/route.ts` 與總覽上「核銷／補發」按鈕：若仍依 DB `balance` 判斷，評估是否改為與顯示餘額一致或保留並於 UI 標示；確保不與「Manager records manual supplemental credit for a selected user」端點衝突。

## 4. Ingest：總覽頁籤與指標列（待實作）

- [x] 4.1 依設計「團隊總支出（全歷史）置於指標列；月份選擇僅在「月份支出統計」頁籤」與「（取代舊決策）團隊當月總支出與月份選擇共用狀態」重構 `src/app/admin/overview/page.tsx` 首屏，落實「Manager overview dashboard hero shows team total historical spend and team displayed balance」：`totals.sumTotalExpense` 為團隊總支出、`totals.teamDisplayRemaining` 為團隊剩餘餘額累計，移除指標列之月份選擇與當月總支出數字。
- [x] 4.2 實作「Manager overview primary tabs below balance summary」：於成員餘額摘要下加入三頁籤（月份支出統計／核銷補發／登錄支出）與面板切換狀態。
- [x] 4.3 實作「Month statistics tab content」：頁籤內月份選擇器驅動 `GET /api/admin/expenses?month=`，顯示該月合計、每人小計與支出記錄表（可沿用現有 aggregate／records 邏輯搬移）。
- [x] 4.4 實作「Reimbursement tab content」與「Reimbursement-needed control activates reimbursement tab and manual supplemental form」：核銷補發頁籤內含手動補發表單與核銷／補發紀錄；點擊需補發時先切換至核銷補發頁籤再捲動與預選。
- [x] 4.5 依 ingest 更新「Manager submits own expense from admin overview」：將 `ExpenseForm` 移入「登錄支出」頁籤；確認主欄不再有孤立的管理者支出區塊。
