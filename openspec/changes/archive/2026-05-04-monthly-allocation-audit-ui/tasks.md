## 1. 後端：admin summary 與補帳驗證

- [x] 1.1 擴充 `src/app/api/admin/summary/route.ts`：依「Manager views allocation setting audit history from admin overview」與設計「決策：稽核歷程由後端一次附於 summary 或獨立子資源」，為每位成員查詢並回傳 `allocationSettingHistory`（依 `createdAt` 降序，實作時訂上限例如 50 筆並在欄位過長時文件化）；每筆含請求起迄、實際起迄、`monthlyAllocationAfter`、`backfilledMonthsCount`、`createdAt` ISO 字串、操作者顯示名稱。
- [x] 1.2 於同一 API 回傳每位成員之 `MonthlyAllocationLog` 終身加總（數值欄位名稱自訂但需穩定），以滿足「Manager views per-member balance summary」中須區分月分配額度與 log 加總之要求；加總演算法與現有 `groupBy` 一致。
- [x] 1.3 依「Backfill missing allocation months when manager sets positive monthly allocation」與設計「決策：過去月份入帳驗證」：以本機或測試資料重現「起迄含早於當月之月份」之 PUT；若 `MonthlyAllocationLog` 或餘額公式未含預期月份，修正 `src/lib/allocation.ts` 或 `src/app/api/admin/members/[id]/allocation/route.ts` 並補最小回歸說明。

## 2. 管理者總覽 UI

- [x] 2.1 編輯 `src/app/admin/overview/page.tsx`：移除主表「最近分配區間」欄位（`th`/`td`），取代原「Manager views last allocation backfill range per member」之單欄呈現，並符合「Manager views allocation setting audit history from admin overview」與設計「決策：主表移除「最近分配區間」直欄」。
- [x] 2.2 於 `src/app/admin/overview/page.tsx`（或拆出之元件）為每位成員新增可開啟之稽核區塊：繪製 `allocationSettingHistory` 列表（新舊列皆顯示），並處理空陣列與載入錯誤狀態。
- [x] 2.3 更新表頭與說明文字：將「月分配金額」標示為每月額度，並顯示 API 提供之 log 終身加總，落實「Manager views per-member balance summary」；表單儲存行為仍須符合「Manager sets monthly allocation per member」（沿用既有 `PUT /api/admin/members/:id/allocation`）。

## 3. 成員儀表板用語

- [x] 3.1 更新 `src/app/dashboard/page.tsx`（及必要之 `src/app/api/member/budget-summary/route.ts` 回傳欄位說明註解）：依「Member views budget summary on dashboard」與設計「決策：用語與成員端對齊」，將每月額度以「月分配金額／每月額度」語意呈現，並維持「分配經費＋補發加總」為 log 加補發之定義。

## 4. 驗收

- [x] 4.1 手動驗證：管理者展開稽核可見多筆歷史；主表無內嵌「僅最近一次起迄」欄；儲存含過去月份起迄後，該成員「月配實際入帳加總」與「Manager views per-member balance summary」「Backfill missing allocation months when manager sets positive monthly allocation」情境一致；成員儀表板文案與數字與 API 一致。

## 5. 月配設定入口與表單（ingest）

- [x] 5.1 依設計「決策：月配「設定分配」入口遷至成員管理頁」：自 `src/app/admin/overview/page.tsx` 移除「設定分配」按鈕及月配 modal；總覽列操作僅保留稽核展開／（可選）導向 `src/app/admin/members/page.tsx` 的連結。

- [x] 5.2 依設計「決策：月配「設定分配」入口遷至成員管理頁」：於 `src/app/admin/members/page.tsx` 加入「設定分配」入口與等同原總覽之 modal（月金額、分配起迄月、PUT `src/app/api/admin/members/[id]/allocation/route.ts` 規則不變）。

- [x] 5.3 依設計「決策：設定分配視窗預填與可編輯欄位」：擴充 `src/app/api/admin/members/route.ts` 之列表回傳，每位成員附加最近一次 `MemberAllocationSettingLog` 之請求起迄（可為 null），供 modal 開啟時預填；開啟時同步帶入 `monthlyAllocation`，且欄位於儲存前皆可編輯。

- [x] 5.4 依設計「決策：設定分配視窗預填與可編輯欄位」與「風險補充（ingest）」：手動或測試驗證「Manager sets member monthly allocation from overview with optional backfill month range」之補帳情境（當前月 4 月、設定 2～5 月每月 5000），確認 `MonthlyAllocationLog` 與成員端「分配經費＋補發加總」含已入帳之過去月份（與「Backfill missing allocation months when manager sets positive monthly allocation」一致）。

## 6. 成員刪除與密碼重設（ingest）

- [x] 6.1 依設計「決策：刪除成員與重設管理者密碼」：實作 MANAGER-only 刪除 API（建議 `src/app/api/admin/members/[id]/route.ts` 之 DELETE），交易中處理關聯資料；禁止刪除自己與刪除後系統無任何 `MANAGER`（HTTP 400 + 明確錯誤訊息），對應「Manager views and manages member accounts」。

- [x] 6.2 依設計「風險補充（ingest）」：於 `src/app/admin/members/page.tsx` 每列加入「刪除」與二次確認（或等價防誤刪流程）。

- [x] 6.3 依設計「決策：刪除成員與重設管理者密碼」：移除列表僅 MEMBER 可「重設密碼」之限制，使 `MANAGER` 列亦顯示按鈕；確認 `src/app/api/admin/members/[id]/reset-password/route.ts` 未排除 MANAGER 目標，並手動驗證重設後可登入。

- [x] 6.4 依設計「決策：刪除成員與重設管理者密碼」與「風險補充（ingest）」：手動驗證「Manager views and manages member accounts」—刪除非最後管理者成功、刪除自己與刪除唯一管理者皆被拒；重設管理者密碼成功。
