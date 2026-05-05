## Why

部署至 Vercel 後資料庫尚未就緒，無法透過登入頁進入系統，導致 Demo 展示卡關。需要一個不依賴資料庫的 Demo Mode，讓展示者可以直接進入管理者介面瀏覽完整 UI。

## What Changes

- 新增 `DEMO_MODE` 環境變數開關（伺服器端）
- 首頁在 Demo Mode 下直接 redirect 至 `/admin/overview`（跳過登入頁）
- 新增 `/api/auth/demo-login` endpoint：不查資料庫，直接簽發含 MANAGER 角色的 JWT cookie
- Admin 各資料 API 在 Demo Mode 下回傳靜態 mock 資料，不查詢資料庫

## Non-Goals

- 不實作 Member Dashboard 的 mock 資料（Demo 只展示管理者視角）
- 不支援 Demo Mode 下的任何寫入操作（支出新增、成員管理等仍可呼叫但非核心）
- 不加入 UI 上的「Demo Mode」標示 banner（保持介面乾淨）

## Capabilities

### New Capabilities

- `demo-mode`: 無資料庫依賴的展示模式，透過環境變數啟用，提供假 JWT 認證與靜態 mock 資料

### Modified Capabilities

- `user-auth`: 新增不查 DB 的 demo-login 路徑，以及首頁在 Demo Mode 下的 redirect 行為

## Impact

- Affected specs: demo-mode（新增）、user-auth（修改）
- Affected code:
  - New: `src/app/api/auth/demo-login/route.ts`
  - Modified: `src/app/page.tsx`
  - Modified: `src/app/api/admin/summary/route.ts`
  - Modified: `src/app/api/admin/expenses/route.ts`
  - Modified: `src/app/api/admin/members/route.ts`
  - Modified: `src/app/api/admin/reimbursements/route.ts`
  - Modified: `src/app/api/admin/categories/route.ts`
