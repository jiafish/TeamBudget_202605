## 1. Demo Fixture 資料層

- [x] 1.1 [Demo fixture data] [Demo 資料集中管理於單一 fixture 模組] 建立 `src/lib/demo-data.ts`，匯出 `DEMO_USERS`（2 筆，id 0 = MANAGER「管理員」、id 1 = MEMBER「測試成員」，含 monthlyAllocation=3000、balance=1500 欄位）、`DEMO_EXPENSES`（3 筆，userId=1，類別分別為「餐費」「交通費」「餐費」，金額 450、120、380，日期分散於近 3 個月）、`DEMO_CATEGORIES`（2 筆：id 1「餐費」、id 2「交通費」）。每個匯出物件使用與 Prisma 回傳結構相同的 TypeScript 型別標注（id, amount, date, description, categoryId, userId, createdAt）。

## 2. Demo Login API 擴充

- [x] 2.1 [Demo mode identity switch login] [擴充現有 demo-login API，不新建端點] 修改 `src/app/api/auth/demo-login/route.ts`：讀取 request body `{ role: "MANAGER" | "MEMBER" }`；若 `role === "MANAGER"` 則 JWT payload 為 `{ userId: 0, role: "MANAGER" }`，若 `role === "MEMBER"` 則為 `{ userId: 1, role: "MEMBER" }`；session cookie 保持 httpOnly、Secure（production）、SameSite=Strict、maxAge 3600；回傳 `{ ok: true, role }`。`DEMO_MODE !== "true"` 時仍回傳 HTTP 403。在函式開頭加入 `console.warn("[DEMO] demo-login called — ensure DEMO_MODE is not set in production")` 警示。

## 3. 登入頁 Demo 模式 UI

- [x] 3.1 [Demo mode identity switch login UI] 修改 `src/app/login/page.tsx`：在 server component 層讀取 `process.env.DEMO_MODE`，將 `isDemoMode` boolean 以 prop 傳入 client component（或直接在 server component 條件渲染）。當 `isDemoMode === true` 時，隱藏原有帳號密碼表單，改為顯示兩個按鈕：「管理員登入」（onClick POST `{ role: "MANAGER" }` 至 `/api/auth/demo-login`）與「成員登入」（onClick POST `{ role: "MEMBER" }` 至 `/api/auth/demo-login`）。兩個按鈕點擊後，依回傳 role 執行 `router.push("/dashboard")`，並在等待 API 回應期間顯示 loading 狀態防止重複點擊。當 `isDemoMode === false` 時，頁面保持原有帳號密碼表單邏輯不變。

## 4. API Routes Demo 資料分支

- [x] 4.1 找出所有在正常模式下執行 Prisma 查詢的 data-fetch API routes（目標：支出列表、預算摘要、管理員總覽、成員列表、類別列表）。在每個 route 的最上方加入 `const isDemo = process.env.DEMO_MODE === "true"`，若 `isDemo` 為 true 則直接 return fixture 資料（從 `src/lib/demo-data.ts` import），不執行 Prisma 查詢。寫入類操作（POST/PUT/DELETE）在 Demo 模式下回傳 `{ ok: true, demo: true }` 而不實際寫入。
- [x] 4.2 確認 `src/lib/prisma.ts` 的 Prisma client 在 `DEMO_MODE=true` 時不初始化（lazy initialization 或條件判斷），避免因資料庫連線失敗而導致 import 錯誤。

## 5. 環境變數設定

- [x] 5.1 [Demo mode activation via environment variable] [Demo 模式以環境變數控制，不使用 JWT role 判斷] 在 `.env.local` 新增一行 `DEMO_MODE=true` 作為本機開發預設值，並在 `.env` 中加入 `# DEMO_MODE=true  # 取消註解以啟用展示模式` 說明註解。

## 6. 修復：伺服器端 DEMO_MODE 未生效

- [x] 6.1 [Demo mode activation via environment variable] 修復「訪客模式未啟用」錯誤。現象：UI 正確顯示雙按鈕（`NEXT_PUBLIC_DEMO_MODE=true` 生效），但點擊後 `/api/auth/demo-login` 回傳 HTTP 403（`DEMO_MODE` 伺服器端未載入）。根本原因：Next.js dev server 在 `.env.local` 修改後必須重啟才能讀取 server-side 環境變數。修復方式：停止目前的 `npm run dev` 程序，重新執行 `npm run dev`，待伺服器啟動後確認點擊「管理員登入」或「成員登入」不再出現錯誤訊息，並成功跳轉至對應頁面。
