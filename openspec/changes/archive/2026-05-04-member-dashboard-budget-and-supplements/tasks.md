## 1. 後端：獨立 REST 端點與聚合邏輯

- [x] 1.1 新增成員用 budget summary API（採用獨立 REST 端點承載聚合與補發列表，而非僅擴充 `GET /api/auth/me`）：以 `getSessionFromRequest` 驗證登入；以 `session.userId` 查詢並回傳 `monthlyAllocation`、`MonthlyAllocationLog` 金額加總、全期 `ExpenseRecord` 金額加總，以及「加總減總支出」之可用餘額（Member views budget summary on dashboard；可用餘額計算僅依 `MonthlyAllocationLog` 與 `ExpenseRecord`，不依 `User.balance`）。
- [x] 1.2 新增成員用 reimbursement 列表 API：僅查 `targetUserId === session.userId`，`orderBy createdAt desc`，JSON 欄位鍵名與語意對齊 `src/app/api/admin/reimbursements/route.ts`（Member views reimbursement decision history on dashboard；補發列表回應欄位與管理者 `GET /api/admin/reimbursements` 對齊）。
- [x] 1.3 兩支 API 均不得接受客戶端指定之目標 userId；未登入回 401；確保無 session 時不洩漏資料（Member cannot access other members' data）。

## 2. 前端：成員儀表板呈現

- [x] 2.1 更新 `src/app/dashboard/page.tsx`：於載入時 fetch budget summary，顯示「每月固定經費／總支出（全期）／月配 log 加總／可用餘額」等與規格一致之標籤與數字，並保留既有帳本餘額顯示與支出表單行為（Member views budget summary on dashboard）。
- [x] 2.2 同一頁新增「核銷／補發紀錄」表格：欄位與 `src/app/admin/overview/page.tsx` 中核銷／補發紀錄表格一致，資料來自新 reimbursement API（Member views reimbursement decision history on dashboard）。

## 3. 驗證

- [x] 3.1 以測試帳號手動驗證：符合規格範例（四個月各 4000、總支出 2000 時顯示 16000 與 14000）（Member views budget summary on dashboard）。
- [x] 3.2 手動驗證：僅能取得本人列與本人聚合；無法透過參數讀取其他成員（Member cannot access other members' data）。

## 4. 設定月分配金額時補齊分配月份（ingest）

- [x] 4.1 在 `src/app/api/admin/members/[id]/allocation/route.ts`（或抽離至 `src/lib/allocation.ts` 之共用函式）於成功更新 `monthlyAllocation` 為正整數後，依 `design.md`「補齊分配月份之曆月範圍與金額」逐月檢查：自該成員 `createdAt` 所屬曆月起至當前曆月，對缺 `MonthlyAllocationLog` 之 `YYYY-MM` 建立 log（`amount` 為**本次寫入之**月配金額）並原子性 `balance` 增加；已存在 `userId_month` 者跳過；`monthlyAllocation` 設為 0 時不執行補帳（Backfill missing allocation months when manager sets positive monthly allocation；並維持 design「可用餘額計算依 `MonthlyAllocationLog` 金額加總與 `ExpenseRecord`，不依 `User.balance`」之前提，缺月補帳後成員加總與 log 一致）。
- [x] 4.2 新增或更新 `openspec/changes/member-dashboard-budget-and-supplements/specs/budget-allocation/spec.md` delta，並於歸檔時合併至 `openspec/specs/budget-allocation/spec.md`：`Manager sets monthly allocation per member` 與補齊缺月行為之 SHALL／情境（含 idempotency：同一月不重複入帳）。
- [x] 4.3 （選擇性）管理者 UI：於 `src/app/admin/overview/page.tsx` 編輯月配成功後提示已補入帳之月份數或「已補齊缺漏月配」簡短訊息；若僅後端補帳可略過。
- [x] 4.4 手動驗證：將成員月配自 0 改為正值或調整金額後，缺漏月份之 log 與 `balance` 與成員儀表板「每月分配經費加總」一致；重複儲存同一金額不造成重複入帳。

## 5. 管理者設定月配之分配月份起迄（ingest）

- [x] 5.1 擴充 `PUT /api/admin/members/[id]/allocation` 請求 JSON：可選（須成對）`backfillFromMonth`、`backfillToMonth`（`YYYY-MM`）。驗證規則見 `design.md`「起迄參數驗證與部分帶入規則」：僅帶一邊、格式錯誤或 `from > to` 時回 400 且**不**更新 `monthlyAllocation`；通過後再更新金額並呼叫 `src/lib/allocation.ts` 補帳，補帳曆月區間為「起迄與建立月～當月之交集」（Backfill missing allocation months when manager sets positive monthly allocation）。
- [x] 5.2 重構或擴充 `backfillAllocationLogsForMember`（或等價函式）接受明確 `fromMonth`／`toMonth` 字串參數；省略時行為與目前「`createdAt` 月～當月」一致（補齊分配月份之曆月範圍與金額）。
- [x] 5.3 於 `src/app/admin/overview/page.tsx` 月配編輯表單新增兩個 `type="month"`（或轉成 `YYYY-MM`）之「分配起月」「分配迄月」，與金額一併送出；未填則不送起迄欄位以沿用預設補帳範圍（Manager sets member monthly allocation from overview with optional backfill month range）。
- [x] 5.4 確認 `openspec/changes/member-dashboard-budget-and-supplements/specs/budget-allocation/spec.md`、`specs/manager-overview/spec.md` 與主規格 `openspec/specs/budget-allocation/spec.md`、`openspec/specs/manager-overview/spec.md` 已納入起迄、驗證與總覽 UI 行為（含僅省略起迄之預設行為）。
- [x] 5.5 手動驗證：指定起迄僅補該區間缺月；省略起迄與舊版一致；錯誤格式與單邊欄位回 400 且不寫入金額。

## 6. 月配起迄稽核與「分配經費＋補發加總」（ingest 2026-b）

- [x] 6.1 於 `prisma/schema.prisma` 新增月配設定稽核模型（例如 `MemberAllocationSettingLog`）：`memberUserId`、`managerUserId`、`monthlyAllocationAfter`、請求起迄（可空）、**實際補帳評估區間**起迄（可空）、`backfilledMonthsCount`、`createdAt`；建立 migration；於 `User` 上新增關聯（若 Prisma 慣例需要）；欄位定義對齊 `design.md`「月配設定稽核列（持久化起迄與操作）」。
- [x] 6.2 擴充 `PUT /api/admin/members/[id]/allocation/route.ts`：在成功更新 `monthlyAllocation` 且補帳完成後，依 `design.md`「月配設定稽核列（持久化起迄與操作）」寫入一筆稽核列（含本次 `session` 管理者 id、請求起迄、計算後之 `effectiveBackfillFrom`／`To` 與 `backfilledMonths`）；`monthlyAllocation` 為 0 時仍寫入稽核列（補帳筆數為 0，實際區間 `null`）（Persist each manager allocation update including effective backfill range）。
- [x] 6.3 擴充 `GET /api/admin/summary/route.ts`：每位 `members` 元素附帶**最新一筆**稽核列（或摺疊為 `lastAllocationSetting` 物件：請求起迄、實際區間、異動時間、管理者顯示名稱、`monthlyAllocationAfter`），供 `src/app/admin/overview/page.tsx` 在成員摘要表顯示「最近一次分配起迄／實際補帳區間」等（Persist each manager allocation update including effective backfill range；Manager views last allocation backfill range per member）。
- [x] 6.4 更新 `src/app/api/member/budget-summary/route.ts`：回傳 `totalAllocatedFromLogs`、`totalSupplementCreditsReimbursed`（定義：`ReimbursementDecision` 之 `targetUserId`＝本人且 `reimbursed === true` 的 `creditAmount` 加總）、`totalAllocationAndSupplements`（兩者之和）、`availableAfterAllocationsAndSupplements`（該和減全期支出）；保留或淘汰舊欄位名時須同步更新 `src/app/dashboard/page.tsx`。**UI 主列標籤**改為「分配經費＋補發加總」並對應 `totalAllocationAndSupplements`；可用餘額改為新公式；計算定義見 `design.md`「可用餘額與「分配經費＋補發加總」依 log、補發入帳與 `ExpenseRecord`，不依 `User.balance`」（Member views budget summary on dashboard）。
- [x] 6.5 更新 `src/app/dashboard/page.tsx`：移除舊「不含補發入帳」之誤導說明；可選擇以次要文字顯示「月配 log 加總」「補發加總」兩數拆項以利理解。
- [x] 6.6 同步 `openspec/changes/member-dashboard-budget-and-supplements/specs/member-dashboard/spec.md`、`specs/budget-allocation/spec.md`、`specs/manager-overview/spec.md` 與主規格 `openspec/specs/member-dashboard/spec.md`、`openspec/specs/budget-allocation/spec.md`、`openspec/specs/manager-overview/spec.md`：稽核持久化、管理者摘要、成員加總與可用餘額定義（含至少一則含補發金額之範例情境）。
- [x] 6.7 手動驗證：儲存月配後總覽可見最近一次起迄；成員儀表板主加總＝log 加總＋已入帳補發加總，可用餘額與新公式一致。
