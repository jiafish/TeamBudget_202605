## Context

一般成員儀表板實作於 `src/app/dashboard/page.tsx`，目前透過 `GET /api/auth/me` 取得 `balance`、`monthlyAllocation` 與姓名，支出則透過 `GET /api/expenses?month=`。管理者總覽已具備成員維度之 `totalExpense`、`displayRemaining` 類似邏輯（見 `src/app/api/admin/summary/route.ts`）以及全表 `ReimbursementDecision` 列表（`src/app/api/admin/reimbursements/route.ts`）。成員端尚無「月配 log 加總」與「本人補發／核銷列」之讀取 API。

## Goals / Non-Goals

**Goals:**

- 成員儀表板可讀取並顯示：每月固定經費（`monthlyAllocation`）、總支出（全期間支出加總）、**分配經費＋補發加總**（`MonthlyAllocationLog.amount` 加總 **加上** 本人 `ReimbursementDecision` 中 `reimbursed === true` 之 `creditAmount` 加總）、可用餘額（**該加總**減總支出）；儀表板不顯示帳本餘額卡片（`balance` 仍可由 `GET /api/auth/me` 取得）。
- 管理者每次成功儲存成員月配（含起迄選填與補帳結果）後，寫入一筆**不可變**稽核列，供總覽顯示「最近一次分配起迄／實際補帳區間／異動時間／操作者」；成員端 API 可選擇回傳本人最近一次稽核摘要以利對照（僅 `session.userId`）。
- 成員儀表板可讀取並以與管理者總覽相同欄位結構顯示本人之 `ReimbursementDecision` 紀錄（依建立時間新到舊排序，與管理者列表一致）。
- 所有新端點與查詢必須強制 `session.userId` 範圍，MEMBER 無法透過參數窺視他人資料。

**Non-Goals:**

- 手動補發、核銷寫入流程維持不變。
- 不在本設計內重新定義 `User.balance` 欄位之語意；補帳時仍透過 `balance` 增量與既有月配排程一致。

**Ingest 延伸目標（設定月分配金額與分配月份）：**

- 當 MANAGER 更新成員 `monthlyAllocation` 為正整數時，除寫入設定值外，應在約定曆月範圍內**補齊缺漏**之 `MonthlyAllocationLog` 並同步增加 `balance`，避免成員端「每月分配經費加總」因缺 log 而低於實際應入帳月份數。

**Ingest（起迄月份）：**

- 管理者可於同一請求選填 **`backfillFromMonth`**、**`backfillToMonth`**（皆為 `YYYY-MM`，須成對出現或皆省略）。省略時補帳範圍與既有行為相同（成員 `createdAt` 所屬曆月起至伺服端當前曆月）；有填寫時，實際補帳區間為 `[max(起, 建立月), min(迄, 當前曆月)]` 之 inclusive 列舉；若交集為空則不建立新 log、不調整 `balance`（仍會更新 `monthlyAllocation` 設定值，除非驗證失敗導致整請求失敗——見下項決策）。

## Decisions

### 採用獨立 REST 端點承載聚合與補發列表，而非僅擴充 `GET /api/auth/me`

**理由**：`me` 以登入狀態與基本身分為主；月配 log 加總與全期間支出需額外聚合查詢，與「本人補發列表」生命週期不同。拆出例如 `GET /api/member/budget-summary`（或單一端點回傳物件含 `monthlyAllocation`、`totalAllocatedFromLogs`、`totalExpenseAllTime`、`availableFromAllocations`）與 `GET /api/member/reimbursements`（或併入同一 JSON）可降低 `me` 負載並讓前端錯誤處理分離。

**替代方案**：全部塞入 `GET /api/auth/me`。**未採用原因**：回應體膨脹、快取語意混淆，且與認證端點責任分離較差。

### 補發列表回應欄位與管理者 `GET /api/admin/reimbursements` 對齊

**理由**：管理者總覽前端已使用 `id`、`targetUserId`、`targetName`、`managerUserId`、`managerName`、`reimbursed`、`creditAmount`、`note`、`createdAt`（見 `src/app/api/admin/reimbursements/route.ts` 映射）。成員端列表 SHALL 使用相同欄位鍵名與語意，僅篩選 `targetUserId` 等於 session 使用者；成員回應中 `targetName` 仍為本人姓名，與管理者列一致以利共用呈現元件或複製表格標頭文案。

**替代方案**：自訂精簡欄位。**未採用原因**：與「格式同管理者」需求衝突。

### 可用餘額與「分配經費＋補發加總」依 log、補發入帳與 `ExpenseRecord`，不依 `User.balance`

**理由**（ingest 2026-b）：主加總列改為「分配經費＋補發加總」＝ `sum(MonthlyAllocationLog.amount)` + `sum(creditAmount)`（僅計入 `targetUserId` 為本人且 `reimbursed === true` 之 `ReimbursementDecision`，與手動補發入帳一致）；「可用餘額」＝該加總減 `sum(ExpenseRecord.amount)`，使成員端與「含補發之可用額」直覺一致。帳本 `balance` 仍可由 `me` 取得，儀表板文案區分兩者。

**風險**：帳本 `balance` 與公式餘額仍可能因歷史調帳等不完全相等。**緩解**：維持雙軌說明；稽核列協助追溯管理者設定與補帳區間。

### 月配設定稽核列（持久化起迄與操作）

**作法**：新增資料表（例如 `MemberAllocationSettingLog`）欄位至少包含：`memberUserId`、`managerUserId`、`monthlyAllocationAfter`、請求之 `backfillFromMonth`／`backfillToMonth`（JSON 若省略則存 `null`）、該次實際用於補帳評估之 `effectiveBackfillFromMonth`／`effectiveBackfillToMonth`（`B` 非空時為 `B` 之 min／max `YYYY-MM`；`B` 空或未跑補帳則 `null`）、`backfilledMonthsCount`、`createdAt`。於 `PUT .../allocation` **成功**（已 commit 新 `monthlyAllocation` 且補帳流程結束）後插入一列。`GET /api/admin/summary` 之各成員物件附帶該成員**最新一筆**稽核列（或等價欄位）供總覽表顯示。`GET /api/member/budget-summary` 可附帶本人最新一筆供成員對照（僅本人）。

**理由**：滿足「起迄應保留記錄」與管理者確認分配狀況；與既有 `MonthlyAllocationLog` 分離，不影響每月唯一列語意。

**風險**：表成長。**緩解**：僅 append；必要時日後歸檔。

**替代方案**：把起迄寫在 `User`。**未採用原因**：無法保留歷史多次調整；稽核表較清晰。

### 補齊分配月份之曆月範圍與金額

**作法**：於 `PUT /api/admin/members/:id/allocation` 成功更新 `monthlyAllocation = A`（A>0）後，以交易或有序步驟：先決定**補帳曆月閉區間** `R`——若請求未帶 `backfillFromMonth`／`backfillToMonth`，則 `R` 為自該成員 `User.createdAt` 所屬曆月起至**伺服端當前曆月**止；若有帶且驗證通過，則 `R` 為使用者起迄與「建立月～當月」之交集。對 `R` 內每個 `YYYY-MM`，若尚無該成員之 `MonthlyAllocationLog`，則建立一筆 `amount = A` 並 `balance += A`；已存在 log 之月份不重複入帳（依 `userId_month` 唯一約束）。月分格式與 `runMonthlyAllocation`／cron 相同（伺服器本地曆 `YYYY-MM`）。

**理由**：與 ingest「設定月分配金額增加分配的月份」對齊；缺漏多為未跑 cron，補齊後成員儀表板加總與入帳月份數一致。

**替代方案**：另建管理按鈕只觸發「手動補某月」（既有 trigger API）。**未採用為唯一方案原因**：使用者期望在**改設定當下**即補齊缺月，減少遺漏操作。

**風險**：若 `balance` 曾經由補發調整，回溯補帳可能使帳本餘額高於使用者心理帳。**緩解**：僅補無 log 之月；文件標示為「缺月補帳」；必要時後續改為「僅補未來月」之設定旗標。

### 起迄參數驗證與部分帶入規則

**作法**：`backfillFromMonth` 與 `backfillToMonth` **須同時出現或同時省略**；若僅帶一個則回 **400** 且不更新 `monthlyAllocation`（整請求失敗，避免半套狀態）。兩者皆須符合 `YYYY-MM` 正則且 `backfillFromMonth <= backfillToMonth`；與成員建立月、當前曆月取交集後若為空（例如起迄全落在未來相對於 `C`），則 **零筆補帳、仍寫入新的 `monthlyAllocation`**（與主／delta 規格一致）。

**理由**：避免管理者誤填半套欄位；與 UI 兩個 `month` 輸入框對齊。

**風險**：與舊版只送 `monthlyAllocation` 的客戶端相容——省略起迄即舊行為。

## Risks / Trade-offs

- **[Risk] 成員誤解「可用餘額」與帳本餘額不一致** → **緩解**：介面文案區分兩者定義；規格內含範例與欄位說明。
- **[Risk] 新 API 忘記角色或 userId 篩選導致資料外洩** → **緩解**：實作僅使用 `session.userId` 作為查詢條件，不接受客戶端傳入之目標 userId；MEMBER 與 MANAGER 行為分離（MANAGER 不應誤用成員端點讀取團隊資料，若需可另案）。
- **[Trade-off] 額外 round-trip** → 儀表板載入多一次 fetch；可接受，必要時後續再合併端點最佳化。

## Migration Plan

- 新增 `MemberAllocationSettingLog`（或專案內最終命名）之 Prisma migration；部署後既有資料無須回填（成員之「最近一次」可為 `null` 直至首次成功儲存月配後）。
- 部署後更新 `budget-summary`、儀表板文案、`admin/summary`、allocation `PUT` 寫入稽核；既有 `me` 與 `expenses` 行為保留。

## Open Questions

無。若產品後續決定隱藏帳本餘額或改為單一「餘額」來源，另開變更調整 `member-dashboard` 規格與 UI。
