## Context

目前系統的登入流程透過 `/api/auth/login` 查詢 PostgreSQL 資料庫驗證使用者。`prisma/schema.prisma` 宣告 provider 為 `postgresql`，但 `.env` 指向 SQLite 檔案，導致資料庫無法連線。系統需要一個不依賴任何資料庫的展示模式，供團隊在建置正式資料庫前能完整操作所有功能。

已有雛型：`/api/auth/demo-login` 可繞過資料庫，但僅支援 MANAGER 角色且 UI 未整合。

## Goals / Non-Goals

**Goals:**

- Demo 模式透過 `DEMO_MODE=true` 環境變數啟用，預設關閉
- 登入頁在 Demo 模式下顯示兩個按鈕（管理員 / 成員），點擊後立即登入，不需帳號密碼
- `/api/auth/demo-login` 接受 `{ role: "MANAGER" | "MEMBER" }` body，簽發對應 JWT
- 所有頁面 API 在 Demo 模式下回傳 fixture 資料，不執行 Prisma 查詢
- Fixture 資料集中在 `src/lib/demo-data.ts`，包含 2 名成員、3 筆支出紀錄

**Non-Goals:**

- Demo 模式不支援寫入操作（新增/編輯/刪除在 Demo 模式下為 no-op 或顯示提示）
- 不修改 Prisma schema 或資料庫連線設定
- 不實作 Demo 資料的持久化

## Decisions

### Demo 資料集中管理於單一 fixture 模組

建立 `src/lib/demo-data.ts` 匯出所有 hardcoded 假資料（使用者、支出、類別）。各 API route 在 Demo 模式下 import 此模組取代 Prisma 查詢。

理由：集中管理避免假資料散落各 route，未來切換真實資料庫只需移除各 route 的 Demo 分支即可。

### Demo 模式以環境變數控制，不使用 JWT role 判斷

透過 `process.env.DEMO_MODE === "true"` 在伺服器端判斷是否進入 Demo 分支，而非在 JWT 中加入特殊 flag。

理由：環境變數是 server-side 設定，避免客戶端偽造 Demo JWT 進入真實資料庫環境。

### 擴充現有 demo-login API，不新建端點

修改 `/api/auth/demo-login/route.ts` 接受 `{ role }` body，簽發對應 userId（MANAGER = 0, MEMBER = 1）與 role 的 JWT。

理由：複用現有路由，減少新增端點帶來的路由管理複雜度。

## Risks / Trade-offs

- **假資料與 UI 不一致風險**：若未來 UI 新增欄位，fixture 需手動同步 → 緩解：fixture 使用 TypeScript 型別標注，型別錯誤會在編譯期發現
- **Demo 模式意外用於正式環境**：若 `DEMO_MODE=true` 錯誤設定到正式伺服器，所有人可無密碼登入 → 緩解：在 `/api/auth/demo-login` 加入明顯的 console.warn 提示
