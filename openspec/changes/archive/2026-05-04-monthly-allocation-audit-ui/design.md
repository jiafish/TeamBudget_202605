## Context

管理者總覽的成員表目前同時顯示「月分配金額」（`User.monthlyAllocation`，每月額度）與「最近分配區間」（來自 `MemberAllocationSettingLog` 最新一筆）。使用者需要查歷次起迄與實際補帳，單一「最近」欄不足；且文案易讓人誤以為「月分配金額」等於已入帳加總。稽核資料已寫入 DB，缺的是 API 聚合與 UI 呈現。成員儀表板已有「分配經費＋補發加總」公式，需與管理者端用語對齊。

## Goals / Non-Goals

**Goals:**

- 主表移除「最近分配區間」直欄，改為每位成員可開啟／展開之稽核歷程（新舊皆由 `MemberAllocationSettingLog` 依 `createdAt` 降序列出）。
- `GET /api/admin/summary`（或等價 MANAGER API）回傳每位成員之 `allocationSettingHistory`（陣列，元素含請求起迄、實際起迄、`monthlyAllocationAfter`、`backfilledMonthsCount`、`createdAt`、操作者名稱），或於同頁以額外請求 `GET /api/admin/members/:id/allocation-settings` 取得；擇一實作並在設計中固定，避免 N+1 過度時再評估批次欄位。
- 主表補充或調整欄位標籤：明確區分「月分配金額（每月額度）」與「月配實際入帳加總（該成員所有 `MonthlyAllocationLog.amount` 之和）」；後者若主表過寬可置於稽核區塊上方摘要一行。
- 實作前以手動或單元方式驗證：當請求起迄包含早於當月之月份且交集非空時，新補上的 log 會出現在該月，且成員「顯示餘額」公式之 log 加總含該月；若發現程式與規格不符則修正 `src/lib/allocation.ts` 或 allocation route。

**Non-Goals:**

- 不重做核銷、支出、Cron 排程之整體架構。
- 不強制匯出稽核 CSV。

## Decisions

### 決策：稽核歷程由後端一次附於 summary 或獨立子資源

**選擇**：優先在 `GET /api/admin/summary` 之每位成員物件內新增 `allocationSettingHistory: Array<...>`（上限例如每員 50 筆，超出可截斷並於回傳標註 `truncated: true`），使總覽單次載入即可完成；若 payload 過大再改為依成員 lazy fetch。

**理由**：總覽已載入全員列表，多數實驗室成員數小；減少往返與實作複雜度。

**替代方案**：`GET /api/admin/members/:id/allocation-settings` 僅在展開列時請求；較省頻寬但需處理 loading 狀態。

### 決策：主表移除「最近分配區間」直欄

**選擇**：刪除該 `th`/`td` 與 `lastAllocationSetting` 在主表之直接渲染；`lastAllocationSetting` 可保留於 API 作為「預設展開稽核時捲動錨點」或完全改由 history 陣列第一筆取代，實作時二選一並刪除冗餘欄位。

**理由**：符合需求「移除最近分配區間」並改以歷程呈現。

### 決策：用語與成員端對齊

**選擇**：儀表板與總覽說明文字統一：「月分配金額」僅指每月額度；「月配實際入帳加總」或沿用成員端「分配經費」之 log 部分語意，於管理者表下註解說明與成員公式一致。

**理由**：降低跨角色誤解。

### 決策：過去月份入帳驗證

**選擇**：實作前先以現有 `backfillAllocationLogsForMember` 行為對照規格；若測試發現交集月份未寫入 log 或加總不含，再最小修正交集與交易邏輯並補回歸情境。

**理由**：現行程式理論上已涵蓋過去月，避免無根據重寫。

## Risks / Trade-offs

- **[風險] summary 回應變大** → [緩解] 每員 history 筆數上限、或改 lazy endpoint。
- **[風險] 與成員端 `lastAllocationSetting` 顯示策略不一致** → [緩解] 成員端僅調整標籤與說明，不強制顯示完整歷史（本變更範圍以管理者為主；若提案含成員則僅文案）。

## Migration Plan

- 僅應用程式變更，無 DB schema 變更預期。
- 部署後既有稽核列自動出現在歷程 UI；無資料遷移。

## Open Questions

- 每員稽核列上限（50 是否足夠）待產品確認；實作可先採 50。

---

## （ingest）擴充脈絡與決策

### 決策：月配「設定分配」入口遷至成員管理頁

**選擇**：自 `src/app/admin/overview/page.tsx` 移除「設定分配」按鈕與對應 modal；於 `src/app/admin/members/page.tsx` 為每一列（或每列操作區）提供「設定分配」，呼叫同一 `PUT /api/admin/members/:id/allocation`。

**理由**：與帳號維護同一脈絡；總覽保留餘額與稽核展開即可。

**替代方案**：總覽保留連結跳轉至 members 並帶 query 開 modal；首版可採純遷移不重複雙入口。

### 決策：設定分配視窗預填與可編輯欄位

**選擇**：開啟 modal 時預填：`monthlyAllocation` 取自 `User.monthlyAllocation`；起迄月取自該成員**最新一筆** `MemberAllocationSettingLog` 之 `requestedBackfillFromMonth`／`requestedBackfillToMonth`（若皆為 `null` 則輸入框留空代表沿用「預設補帳區間」語意）。三者皆可編輯後送出。

**理由**：滿足「方便未來查閱且可變更」；與使用者情境（4 月補設定 2～5 月、每月 5000）一致。

**資料來源**：擴充 `GET /api/admin/members` 回傳每員之 `latestAllocationRequestedFromMonth`／`latestAllocationRequestedToMonth`（或等價巢狀物件），或於開啟 modal 時另打輕量 API；首版優先擴充 list 回傳避免 N 次請求。

### 決策：刪除成員與重設管理者密碼

**選擇**：新增 `DELETE /api/admin/members/:id`（或等價），僅 MANAGER 可呼叫；禁止刪除**自己**或刪除後將導致系統無任何 MANAGER 帳號之目標（回傳 400 與明確錯誤碼／訊息）。刪除採交易：依 Prisma schema 以 `onDelete` 或顯式刪除關聯列（支出、月配 log、稽核、補發等）定序實作。

**重設密碼**：`PUT .../reset-password` 已不區分角色；前端移除「非 MANAGER 才顯示重設」之限制。若重設對象為目前登入之自己，成功後應使其他裝置 session 失效並可選擇導向重新登入（沿用既有密碼變更慣例即可）。

### 風險補充（ingest）

- **[風險] 刪除成員誤觸** → [緩解] 二次確認對話框＋輸入登入號碼或姓名片段（擇一實作）。
