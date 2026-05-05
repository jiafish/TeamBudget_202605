## Context

專案使用 Next.js 16 App Router + SQLite/Prisma，部署於 Vercel Serverless。認證機制為 JWT httpOnly cookie（由 `/api/auth/login` 簽發）。Admin 頁面為 `"use client"` 元件，透過多支 `/api/admin/*` API 拉取資料，並對 HTTP 401 回應執行 `router.push("/login")`。

目前 Vercel 上資料庫尚未就緒，所有 API 回 500，無法展示任何功能。

## Goals / Non-Goals

**Goals:**

- 透過 `DEMO_MODE=true` 環境變數讓整個展示路徑免資料庫可用
- 首頁自動進入管理者介面，不顯示登入頁
- Admin 資料 API 在 Demo Mode 下回傳靜態、有意義的 mock 資料
- Mock 資料需覆蓋所有 admin overview 頁面會呼叫的 endpoint

**Non-Goals:**

- Member Dashboard 的 mock 資料
- Demo Mode 下的寫入操作正確性
- UI 上顯示 Demo Mode 標示

## Decisions

### Demo Mode 透過伺服器端環境變數控制，而非前端

`DEMO_MODE` 讀自 `process.env.DEMO_MODE`（伺服器端），不使用 `NEXT_PUBLIC_*`。
理由：`NEXT_PUBLIC_*` 會打包進客戶端 bundle，使 mock 邏輯暴露給所有使用者。伺服器端控制可確保 API route 的分支判斷不洩漏到前端。

Alternative considered: `NEXT_PUBLIC_DEMO_MODE` — 拒絕，因為 API route 內的分支（包含 mock 資料結構）會被靜態分析打包進 client bundle。

### 首頁 redirect 邏輯內嵌於 page.tsx

`src/app/page.tsx` 讀取 `process.env.DEMO_MODE`，為 `"true"` 時改 redirect 至 `/admin/overview`。
理由：`page.tsx` 本身已是 Server Component，讀取 env var 是零成本操作，不需要新增 middleware。

### Demo 認證透過專屬 endpoint `/api/auth/demo-login`

首頁 redirect 前先透過 Server Component 直接呼叫（或 admin overview 偵測到無 session 時觸發）的獨立 endpoint。該 endpoint：

1. 確認 `DEMO_MODE=true`，否則回 403
2. 簽發 JWT payload `{ userId: 0, role: "MANAGER" }`，有效期 1 小時
3. 設定 `session` httpOnly cookie
4. 回傳 200

Admin API routes 收到 `userId: 0` 且 `DEMO_MODE=true` 時直接回傳 mock 資料，不查詢資料庫。

Alternative considered: 在 `page.tsx` 直接 set-cookie — 拒絕，Server Component 無法直接設定 cookie（需要 Route Handler 或 Server Action）。

### Mock 資料定義在各 API route 檔案內

每支 API route 在檔案頂部定義 `const DEMO_*` 常數。
理由：集中於單一檔案（如 `demo-data.ts`）雖然整潔，但會造成所有 route 之間隱性耦合，且 mock 資料異動時需同時維護兩處。就地定義讓每個 route 保持自給自足。

### Admin overview 觸發 Demo 登入的方式

`src/app/admin/overview/page.tsx` 在無 session（401）時，若 `NEXT_PUBLIC_DEMO_MODE=true` 則呼叫 `/api/auth/demo-login` 後 reload，而非 redirect 到 `/login`。
理由：Admin 頁面為 `"use client"` 元件，只能讀取 `NEXT_PUBLIC_*` env var。這是唯一需要 `NEXT_PUBLIC_DEMO_MODE` 的地方，且其值僅控制 UI 行為（是否呼叫 demo-login），不暴露任何 mock 邏輯。

## Risks / Trade-offs

- [JWT userId=0 可能與真實 User 衝突] → 所有 Demo Mode 下的 API route 在進入 mock 分支前先檢查 `DEMO_MODE=true`，不依賴 userId=0 作為唯一判斷依據
- [Admin overview 偵測無 session 後的 reload 可能造成無限循環] → demo-login endpoint 簽發成功後 response 設定 cookie，reload 後 session 存在即不再觸發；若 demo-login 本身失敗（非 DEMO_MODE），則 fallback 回原本的 `/login` redirect
- [NEXT_PUBLIC_DEMO_MODE 打包進 bundle] → 此 env var 僅控制「是否呼叫 demo-login」的 UI 行為，不含任何敏感資訊或 mock 資料結構
