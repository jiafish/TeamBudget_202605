## 1. 環境變數設定（Demo Mode activation via environment variable）

- [x] 1.1 於 Vercel 專案環境變數加入 `DEMO_MODE=true`（伺服器端）與 `NEXT_PUBLIC_DEMO_MODE=true`（客戶端）；於 README 補充這兩個變數的說明（Demo Mode activation via environment variable、Demo Mode 透過伺服器端環境變數控制，而非前端）

## 2. 首頁 redirect 邏輯（Homepage redirects to admin overview in Demo Mode）

- [x] 2.1 修改 `src/app/page.tsx`：讀取 `process.env.DEMO_MODE`，為 `"true"` 時 redirect 至 `/admin/overview`，否則維持原有 redirect 至 `/login`（Homepage redirects to admin overview in Demo Mode、Homepage skips login in Demo Mode、首頁 redirect 邏輯內嵌於 page.tsx）

## 3. Demo 認證 endpoint（Demo login endpoint issues JWT without database access）

- [x] 3.1 新增 `src/app/api/auth/demo-login/route.ts`：實作 `POST` handler，當 `DEMO_MODE` 非 `"true"` 時回傳 HTTP 403；當 `DEMO_MODE=true` 時使用現有 `JWT_SECRET` 簽發 payload `{ userId: 0, role: "MANAGER" }`，有效期 1 小時，設定 `session` httpOnly cookie，回傳 HTTP 200（Demo login endpoint issues JWT without database access、Demo 認證透過專屬 endpoint `/api/auth/demo-login`、Demo login sets session cookie、Demo login endpoint provides sessionless JWT）

## 4. Admin overview 自動觸發 Demo 登入

- [x] 4.1 修改 `src/app/admin/overview/page.tsx`：在 401 handler（目前直接 `router.push("/login")`）加入判斷——若 `process.env.NEXT_PUBLIC_DEMO_MODE === "true"`，則先呼叫 `POST /api/auth/demo-login`；成功（HTTP 200）後執行 `window.location.reload()`，失敗則 fallback 至 `router.push("/login")`（Admin overview auto-triggers demo login on 401 in Demo Mode、Admin overview 觸發 Demo 登入的方式）

## 5. Admin 資料 API mock 分支（Admin data APIs return mock data in Demo Mode）

- [x] 5.1 修改 `src/app/api/admin/summary/route.ts`：在 GET handler 的 session 驗證之後、資料庫查詢之前加入 `if (process.env.DEMO_MODE === "true")` 分支，回傳含 3 名成員的靜態 mock JSON（含 name、balance、totalExpense、monthlyAllocation 等欄位），mock 資料定義在各 API route 檔案內（Admin data APIs return mock data in Demo Mode、Admin summary API in Demo Mode、Mock 資料定義在各 API route 檔案內）
- [x] 5.2 修改 `src/app/api/admin/expenses/route.ts`：同上模式，回傳含 5 筆靜態支出記錄的 mock JSON（含 id、userId、amount、date、description、categoryId），不查詢資料庫
- [x] 5.3 修改 `src/app/api/admin/members/route.ts`：同上模式，回傳含 3 名成員的靜態 mock JSON（含 id、name、loginNumber、role、balance、monthlyAllocation）
- [x] 5.4 修改 `src/app/api/admin/reimbursements/route.ts`：同上模式，回傳含 2 筆靜態補發記錄的 mock JSON
- [x] 5.5 修改 `src/app/api/admin/categories/route.ts`：同上模式，回傳含「餐費」「交通費」「辦公用品」3 個靜態分類的 mock JSON
