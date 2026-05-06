## Why

目前登入 API 需連接資料庫驗證帳號密碼，但資料庫環境尚未就緒，導致系統無法展示給團隊成員使用。需要一個不依賴資料庫的展示模式，讓任何人可直接在瀏覽器開啟並操作完整功能。

## What Changes

- 登入頁面改為身份切換介面，提供「管理員（MANAGER）」與「成員（MEMBER）」兩個按鈕直接登入，不需輸入帳號密碼
- 所有頁面的資料來源改為 hardcoded 假資料（fixture），不發出任何資料庫查詢
- Demo 模式透過環境變數 `DEMO_MODE=true` 控制，關閉時系統回歸原有的資料庫登入流程
- 現有的 `/api/auth/demo-login` API 擴充為支援傳入 role 參數（MANAGER / MEMBER）

## Non-Goals

- 不實作 Demo 資料的持久化或寫入（所有操作為唯讀展示）
- 不修改真實登入流程（`/api/auth/login`）的任何邏輯
- 不部署到雲端或設定正式資料庫（此為階段一，後續另行處理）
- 不建立使用者管理介面

## Capabilities

### New Capabilities

- `demo-mode`: 透過環境變數啟用的展示模式，提供身份切換登入介面與 hardcoded 假資料層

### Modified Capabilities

- `user-auth`: 登入頁面新增 Demo 模式身份切換 UI，`/api/auth/demo-login` 支援 role 參數

## Impact

- Affected specs: demo-mode（新增）、user-auth（修改）
- Affected code:
  - New: src/lib/demo-data.ts
  - Modified: src/app/login/page.tsx
  - Modified: src/app/api/auth/demo-login/route.ts
