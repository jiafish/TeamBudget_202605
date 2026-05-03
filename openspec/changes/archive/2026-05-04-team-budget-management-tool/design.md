## Context

專案已可運作（單一團隊、Next.js + Prisma + SQLite）。本變更之增量為管理者後臺 UX 與透支補發流程。目標仍為輕量內部工具，預期同時在線少於 20 人。

## Goals / Non-Goals

**Goals:**

- 以最低維護成本建立可運作的團隊經費管理工具
- 單一 codebase 涵蓋前後端
- 支援收據圖片上傳與持久化儲存
- 每月自動發放分配金額

**Non-Goals:**

- 不支援多團隊（單一部署 = 單一團隊）
- 不支援支出審核流程
- 不支援成員自行註冊
- 不支援匯出報表（CSV/PDF）
- 不支援電子信箱通知

## Decisions

### 技術棧：Next.js App Router + Prisma + SQLite

採用 Next.js 14+ App Router 作為全端框架，API routes 處理後端邏輯，Prisma 作為 ORM，SQLite 作為資料庫。

**為何不分開前後端**：小工具不需要兩個獨立服務的維護負擔，Next.js API routes 對此規模已足夠。

**為何選 SQLite 而非 PostgreSQL**：20 人以內的小工具，SQLite 的並發限制不構成瓶頸；無需另架 DB server，部署更簡單。唯一風險是並發寫入衝突，Prisma 搭配 SQLite WAL mode 可緩解。

### 認證：自訂 JWT（httpOnly Cookie）

不使用 NextAuth：登入號碼 + 密碼的需求不需要 OAuth 的複雜性。

實作方式：
- 密碼以 bcrypt（cost 12）雜湊儲存
- 登入成功後簽發 JWT，存入 httpOnly、Secure、SameSite=Strict 的 cookie
- JWT payload 包含 `userId`、`role`、`exp`（7 天）
- API routes 以 middleware 驗證 JWT

### 收據儲存：本機檔案系統

收據圖片儲存於伺服器本機（`uploads/receipts/`，位於專案根目錄外或透過 volume mount 持久化）。

**為何不用 S3**：對內部小工具而言，引入雲端儲存增加設定複雜度與費用，本機儲存已足夠。

**部署注意**：Vercel 不支援本機檔案持久化，若部署至 Vercel 需改用 S3 或 Vercel Blob。建議優先以 VPS 部署。

檔名採 `{userId}-{timestamp}-{random}.{ext}` 格式避免衝突。存取路徑透過 API route 鑑權後回傳（不直接暴露靜態路徑）。

### 每月自動發放：系統 Cron + 受保護 API Endpoint

不在 Next.js 進程內使用 `node-cron`（進程重啟會遺失排程）。改由外部排程觸發：

- 新增 `POST /api/cron/monthly-allocation` endpoint，需帶 `CRON_SECRET` header
- VPS 以系統 cron（`0 0 1 * *`）呼叫此 endpoint
- Endpoint 具有冪等性：以 `MonthlyAllocationLog` 記錄已發放月份，同一月份不重複發放

### 資料模型

```
User
  id           Int      (PK)
  loginNumber  String   (unique)
  passwordHash String
  role         Enum     MANAGER | MEMBER
  name         String
  monthlyAllocation  Int  (每月分配金額，單位：元)
  balance      Int      (當前累積餘額，原子更新)
  createdAt    DateTime

ExpenseRecord
  id           Int      (PK)
  userId       Int      (FK → User)
  amount       Int      (正整數，支出金額)
  date         DateTime (使用者填寫的支出日期)
  description  String
  receiptPath  String?  (檔案路徑，nullable)
  createdAt    DateTime

MonthlyAllocationLog
  id      Int      (PK)
  userId  Int      (FK → User)
  amount  Int
  month   String   (格式：YYYY-MM)
  createdAt DateTime
  @@unique([userId, month])
```

`balance` 欄位在每次新增支出時原子扣減（`UPDATE user SET balance = balance - amount WHERE id = ?`），在每次月初發放時原子累加，避免讀-改-寫競態。

### 管理者導覽與成員管理頁一致性

`src/app/admin/overview/page.tsx` 已有「總覽／成員管理」頂部列；`src/app/admin/members/page.tsx` 應抽出共用 layout 元件或複製同一 header 區塊，使成員管理頁可一鍵回到 `/admin/overview`，並保留登出。

### 團隊剩餘餘額累計顯示

**定義**：團隊剩餘餘額累計＝資料庫內**所有** `User` 列之 `balance` 的代數和（含 `MANAGER` 與 `MEMBER`）。可於前端對 `GET /api/admin/summary` 回傳陣列加總，或於後端於 summary 回應中附加 `teamBalanceSum` 單一欄位；兩者擇一，以前後端單一來源為佳。

**與當月總支出並列時**：文案必須區分「當月總支出（依支出日期）」與「團隊剩餘餘額累計（帳上餘額加總）」，避免誤解為同一維度。

### 管理者於後臺登錄自身支出

沿用既有 `POST /api/expenses`（已以 `session.userId` 建檔並扣餘額）。於 `admin/overview`（或共用 admin layout）嵌入既有 `ExpenseForm`，成功後重新 fetch summary／expenses。不新增「代成員登錄」參數。

### 透支成員之核銷補發與審計紀錄

**原則**：`ExpenseRecord` 仍不可改刪；補發以**追加一筆審計列 + 原子正數加回 `User.balance`** 完成，與支出分開。

**資料表（建議）**：例如 `ReimbursementDecision`（名稱可調整）欄位至少包含：`targetUserId`（僅限 `MEMBER` 且當下 `balance < 0` 才可建立補發）、`managerUserId`、`reimbursed`（布林：是否執行補發）、`creditAmount`（非負整數；當 `reimbursed` 為真時必須為正且建議上限為能使餘額回到 ≥0 之合理範圍，具體驗證於 API）、`note`（可選）、`createdAt`。

**API**：`POST /api/admin/members/[id]/reimbursement`（僅示意路徑）— MANAGER 專用；驗證 target 為 MEMBER、`balance < 0`；在單一 DB transaction 內寫入審計列並於 `reimbursed=true` 時 `balance += creditAmount`。

**列表**：總覽或成員管理可顯示最近一次決策；完整歷史可另頁或折疊，非首版硬性要求，但資料必須持久可查（至少透過 DB 或管理用 GET）。

## Risks / Trade-offs

- **SQLite 並發寫入**：若多人同時提交支出，可能有短暫 SQLITE_BUSY。緩解方案：啟用 WAL mode（`PRAGMA journal_mode=WAL`），並在 Prisma datasource 設定 `connection_limit=1`。
- **本機收據儲存**：VPS 磁碟空間有限，且檔案不隨 DB 備份。緩解方案：定期備份 `uploads/` 目錄，或未來遷移至物件儲存。
- **Cron 可靠性**：若 VPS 在月初關機，可能漏發一個月的分配。緩解方案：endpoint 支援手動觸發（管理者可在管理介面補發），並檢查是否有未發放的過去月份。
- **補發金額驗證**：若未限制 `creditAmount`，可能被誤輸入過大。緩解：後端校驗上界（例如不超過使 `balance` 超過某合理上限，或至少 `creditAmount <= -balance` 當目標為填平透支）。
