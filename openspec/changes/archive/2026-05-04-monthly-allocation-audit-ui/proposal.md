## Why

管理者在調整「月分配金額」（每月固定發給成員之額度）與分配月份起迄時，需要對照歷次設定與實際入帳，但目前總覽僅顯示「最近一次」區間，且欄位名稱易與「月配實際入帳加總」混淆；另需確認起迄涵蓋過去月份時，入帳與加總與使用者預期一致。成員端儀表板用語應與上述定義對齊，避免誤解。

**（ingest）** 實務上「設定分配」較常與帳號維護一併操作，應集中在成員管理頁；設定視窗須清楚帶出目前月分配金額與起迄月份供查閱與修改（例如：在 4 月為成員補設定 2～5 月、每月 5000，補帳後月配入帳加總與成員端「分配經費＋補發加總」須反映 2、3 月等已入帳月份）。另需於成員管理提供刪除成員，以及可對**含管理者在內**之帳號重設密碼（須訂定安全邊界，避免誤刪或鎖死唯一管理者）。

## What Changes

- 管理者總覽「成員餘額摘要」：移除主表「最近分配區間」欄；改以可查閱之方式呈現每位成員之**月配設定稽核歷程**（含每次儲存之請求起迄、實際補帳起迄、當次月分配金額、補帳筆數、時間、操作者），新資料自既有稽核表讀取。
- 總覽表單維持可設定「月分配金額」與選填之分配月份起迄（與現有 API 語意一致）；必要時補強說明文字，明確區分「月分配金額（每月額度）」與「月配實際入帳加總（歷月 log 加總）」。
- 若現行行為經檢驗後，於起迄含過去月份時仍有漏計或與 `MonthlyAllocationLog` 不一致，則修正後端補帳或彙總邏輯，使「目前餘額／團隊指標」所用之月配入帳加總涵蓋該等月份之已入帳金額。
- 一般成員儀表板：調整文案或摘要區塊，使「月分配金額」與「分配經費／入帳加總」之用語與管理者端一致。

**（ingest）**

- 將管理者總覽成員表之「設定分配」入口**移轉**至 `成員帳號管理` 頁（`/admin/members`）；總覽頁可保留稽核檢視或導向連結，但**不再**於總覽主表提供主要月配編輯入口。
- 成員管理頁之「設定月分配金額」視窗：開啟時**預填**該成員目前 `monthlyAllocation` 與最近一次稽核之請求起迄（若無稽核則起迄留空）；欄位皆可編輯後再儲存，以利事後查閱與調整。
- 成員管理頁：新增**刪除成員**（MANAGER API + 確認流程 + 資料一致性／禁止條件）；**重設密碼**須可對**管理者帳號**操作（目前 UI 僅對 MEMBER 顯示按鈕者須修正），API 須與 UI 一致並訂定不可刪除最後一名可登入管理者等規則。

## Non-Goals

- 不變更核銷補發、支出登錄之核心流程；不進行完整 IAM 或多層級權限模型重構（僅擴充 MANAGER 既有可執行之帳號維護動作）。
- 不要求匯出稽核 CSV 或完整會計報表（除非實作時一併完成極小成本之延伸，本變更以 UI/API 可查為主）。

**（ingest）** 不要求導入完整 IAM（多因素、細粒度權限委派）；刪除／重設密碼以單一 MANAGER 角色可執行為前提，僅補必要防呆。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `manager-overview`：成員摘要表移除「最近分配區間」欄；新增可查閱之月配設定稽核歷程與用語釐清。
- `budget-allocation`：規範「月分配金額」為每月發放額度；規範分配起迄與補帳／`MonthlyAllocationLog` 之一致性及邊界（含過去月份納入加總之驗證敘述）。
- `member-dashboard`：成員端預算摘要與月配相關文案與管理者定義對齊。
- `user-auth`（或等價命名）：擴充「管理者管理成員帳號」—刪除成員、可對管理者重設密碼、與刪除防呆。

## Impact

- Affected specs: `manager-overview`、`budget-allocation`、`member-dashboard`、`user-auth`（delta）
- Affected code:
  - Modified: `src/app/admin/overview/page.tsx`、`src/app/api/admin/summary/route.ts`、`src/app/api/member/budget-summary/route.ts`、`src/app/dashboard/page.tsx`、`src/app/admin/members/page.tsx`、`src/app/api/admin/members/route.ts`、`src/app/api/admin/members/[id]/reset-password/route.ts`
  - Modified（若驗證後需修正入帳邏輯）: `src/lib/allocation.ts`、`src/app/api/admin/members/[id]/allocation/route.ts`
  - New: `src/app/api/admin/members/[id]/route.ts`（若採獨立 DELETE 檔案；亦可合併至既有 members 動態路由，以實作為準）
  - Removed: （無檔案刪除；僅移除或遷移 UI 入口）
