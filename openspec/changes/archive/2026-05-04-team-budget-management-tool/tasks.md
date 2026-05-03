## 1. 專案初始化與資料庫 Schema

- [x] 1.1 建立 Next.js 14 App Router 專案（TypeScript），安裝 Prisma、bcrypt、jose（JWT）、multer（檔案上傳）依賴（對應設計決策：技術棧：Next.js App Router + Prisma + SQLite）
- [x] 1.2 設定 Prisma datasource 使用 SQLite，啟用 WAL mode（`PRAGMA journal_mode=WAL`），設定 `connection_limit=1`（對應設計決策：SQLite 並發寫入）
- [x] 1.3 依照資料模型設計決策建立 Prisma schema：User（含 loginNumber、passwordHash、role、name、monthlyAllocation、balance）、ExpenseRecord（含 amount、date、description、receiptPath）、MonthlyAllocationLog（含 userId、amount、month，unique [userId, month]）
- [x] 1.4 執行初始 migration 並建立 seed script：新增一個預設 MANAGER 帳號（loginNumber="admin"，密碼="admin123"）

## 2. 認證系統

- [x] 2.1 實作 `POST /api/auth/login`：驗證 loginNumber + 密碼（bcrypt 比對），登入成功後以 jose 簽發 JWT（payload: userId, role, exp=7天），設定 httpOnly/Secure/SameSite=Strict cookie（對應設計決策：認證：自訂 JWT（httpOnly Cookie）；對應需求：Login with number and password）
- [x] 2.2 實作 `POST /api/auth/logout`：清除 session cookie（對應需求：Login with number and password）
- [x] 2.3 建立 `src/lib/auth.ts` middleware 工具函式：從 cookie 解析並驗證 JWT，回傳 `{ userId, role }` 或 null；所有受保護的 API routes 使用此函式鑑權（對應需求：Role-based access control）
- [x] 2.4 實作 `POST /api/auth/change-password`：驗證當前密碼後更新 passwordHash，並使所有其他 session 失效（對應需求：Change own password）
- [x] 2.5 建立登入頁面 `src/app/login/page.tsx`：表單含登入號碼和密碼欄位，顯示錯誤訊息"登入號碼或密碼錯誤"（不區分哪個欄位錯誤）（對應需求：Login with number and password）

## 3. 帳號管理（管理者）

- [x] 3.1 實作 `POST /api/admin/members`：建立新成員帳號（name、loginNumber、password），loginNumber 重複時回傳錯誤"此登入號碼已被使用"，密碼以 bcrypt cost=12 雜湊，初始 balance=0（對應需求：Manager creates member accounts）
- [x] 3.2 實作 `GET /api/admin/members`：回傳所有成員清單（id、name、loginNumber、role、monthlyAllocation、balance）（對應需求：Manager views and manages member accounts）
- [x] 3.3 實作 `PUT /api/admin/members/[id]/reset-password`：管理者重設指定成員密碼（對應需求：Manager views and manages member accounts）
- [x] 3.4 建立帳號管理頁面 `src/app/admin/members/page.tsx`：列出所有成員、新增成員表單、重設密碼功能（對應需求：Manager creates member accounts；Manager views and manages member accounts）

## 4. 經費分配管理

- [x] 4.1 實作 `PUT /api/admin/members/[id]/allocation`：MANAGER 設定指定成員的 monthlyAllocation 金額（0 或正整數）（對應需求：Manager sets monthly allocation per member）
- [x] 4.2 實作 `POST /api/cron/monthly-allocation`（受 CRON_SECRET header 保護）：對所有 monthlyAllocation > 0 的成員，若該月份尚無 MonthlyAllocationLog 記錄，則原子累加 balance 並寫入 log；實作冪等性保證（對應設計決策：每月自動發放：系統 Cron + 受保護 API Endpoint；對應需求：Automatic monthly allocation on the first of each month；Balance rollover across months）
- [x] 4.3 實作 `POST /api/admin/allocation/trigger`（MANAGER 手動觸發）：接受 `month` 參數（YYYY-MM），對指定過去月份執行同樣的分配邏輯，並在管理介面顯示執行結果（對應需求：Manager can manually trigger allocation for a missed month）
- [x] 4.4 在管理介面加入「手動補發經費」功能，允許 MANAGER 輸入月份後觸發補發（對應需求：Manager can manually trigger allocation for a missed month）

## 5. 支出記錄

- [x] 5.1 實作 `POST /api/expenses`：建立支出記錄（amount 需為正整數，date、description 必填，receiptPath nullable），以資料庫原子操作扣減 balance（`UPDATE User SET balance = balance - amount`）；amount ≤ 0 時回傳驗證錯誤（對應需求：Member submits an expense record）
- [x] 5.2 實作收據圖片上傳：在 `POST /api/expenses` 中處理 multipart form data，接受 JPEG/PNG/WebP，最大 10 MB，檔名格式 `{userId}-{timestamp}-{random}.{ext}`，儲存至 `uploads/receipts/`（對應設計決策：收據儲存：本機檔案系統；對應需求：Receipt image upload）
- [x] 5.3 實作 `GET /api/expenses/[id]/receipt`：鑑權後提供收據圖片——記錄擁有者或 MANAGER 可存取，其他人回傳 403（對應需求：Receipt image upload；Manager views receipt image；Member views own receipt）
- [x] 5.4 實作 `GET /api/expenses`：依 `userId`（當前使用者）和 `month`（YYYY-MM，預設當月）過濾，以 expense 記錄的 `date` 欄位作為月份判斷依據（對應需求：Expense records are filtered by month）
- [x] 5.5 確認所有 expenses API 均不提供 PUT/DELETE 端點；任何修改或刪除嘗試回傳 403（對應需求：Expense records are immutable）
- [x] 5.6 建立支出登錄表單元件 `src/app/components/ExpenseForm.tsx`：欄位含日期、金額、說明、收據上傳，提交後即時更新餘額顯示（對應需求：Member submits an expense record）

## 6. 成員儀表板

- [x] 6.1 建立成員儀表板頁面 `src/app/dashboard/page.tsx`：頂部顯示當前餘額（負值以紅色標示），下方為當月支出記錄清單，提供月份切換器（對應需求：Member views own expense records by month；Member views own remaining balance）
- [x] 6.2 在 `GET /api/expenses` 中強制執行存取控制：MEMBER 只能查詢自己的記錄，嘗試查詢其他 userId 回傳 403（對應需求：Member cannot access other members' data）
- [x] 6.3 在儀表板加入收據縮圖連結，點擊後透過 `GET /api/expenses/[id]/receipt` 顯示圖片（對應需求：Member views own receipt）

## 7. 管理者總覽

- [x] 7.1 實作 `GET /api/admin/expenses`（MANAGER 限定）：回傳所有成員的支出記錄（含 member name 作為登記人欄位），支援 `month` 參數過濾，預設當月，依 date 降冪排列（對應需求：Manager views all members' expense records）
- [x] 7.2 實作 `GET /api/admin/summary`（MANAGER 限定）：回傳所有成員的 name、monthlyAllocation、balance（對應需求：Manager views per-member balance summary）
- [x] 7.3 在 `GET /api/admin/expenses` 回應中加入聚合統計：當月所有成員總支出、各成員當月支出小計（對應需求：Manager views aggregate expense statistics）
- [x] 7.4 建立管理者總覽頁面 `src/app/admin/overview/page.tsx`：包含月份切換器、成員餘額摘要表（負值成員紅色標示）、所有支出記錄列表（含登記人欄位）、當月聚合統計（對應需求：Manager views all members' expense records；Manager views per-member balance summary；Manager views aggregate expense statistics）

## 8. 存取控制強化

- [x] 8.1 在 Next.js middleware (`src/middleware.ts`) 設定路由保護規則：未登入者重定向至 `/login`；MEMBER 存取 `/admin/*` 時重定向至 `/dashboard`（對應需求：Role-based access control）
- [x] 8.2 對所有 `/api/admin/*` routes 加入 MANAGER 角色驗證，回傳 403 Forbidden（對應需求：Role-based access control）

## 9. 部署設定

- [x] 9.1 建立 `Dockerfile` 及 `.dockerignore`，確保 `uploads/` 目錄透過 volume mount 持久化（對應設計決策：收據儲存：本機檔案系統）
- [x] 9.2 撰寫 VPS 部署說明（README.md）：包含系統 cron 設定範例（`0 0 1 * * curl -H "X-Cron-Secret: <secret>" http://localhost:3000/api/cron/monthly-allocation`）及環境變數清單（CRON_SECRET、JWT_SECRET、DATABASE_URL）（對應設計決策：每月自動發放：系統 Cron + 受保護 API Endpoint）

## 10. 管理者後臺 UX 與透支補發（ingest 增量）

- [x] 10.1 實作與 `admin/overview` 相同之頂部導覽（總覽／成員管理／登出）於 `src/app/admin/members/page.tsx`，或抽出共用 `AdminHeader` 元件供兩頁使用（對應需求：Manager member administration page includes consistent navigation；對應設計決策：管理者導覽與成員管理頁一致性）
- [x] 10.2 於 `src/app/admin/overview/page.tsx` 顯示「團隊剩餘餘額累計」＝`GET /api/admin/summary` 所回傳之所有使用者 `balance` 代數和，文案與當月「總支出」區隔（對應需求：Manager views team cumulative remaining balance；對應設計決策：團隊剩餘餘額累計顯示）
- [x] 10.3 於成員餘額摘要表列，當 `balance < 0` 時顯示固定字樣「需補發經費」標籤（對應需求：Member balance summary shows reimbursement-needed label）
- [x] 10.4 於 `admin/overview` 嵌入既有 `ExpenseForm`（或等價表單）並以 MANAGER session 呼叫 `POST /api/expenses`，成功後刷新 summary 與 expenses（對應需求：Manager submits own expense from admin overview；Member submits an expense record；對應設計決策：管理者於後臺登錄自身支出）
- [x] 10.5 於 `prisma/schema.prisma` 新增 `ReimbursementDecision`（或同等命名）模型：targetUserId、managerUserId、reimbursed、creditAmount、note（可選）、createdAt；建立 migration；於 Prisma 設定與 `User` 之關聯（對應需求：Manager records reimbursement decision for negative member balance；對應設計決策：透支成員之核銷補發與審計紀錄）
- [x] 10.6 實作 `POST /api/admin/members/[id]/reimbursement`（路徑可依專案慣例微調）：驗證 MANAGER、目標為 MEMBER、目標 `balance < 0`；`reimbursed=false` 時僅寫入審計列；`reimbursed=true` 時於同一 transaction 寫入審計列並 `balance += creditAmount`（對應需求：Manager records reimbursement decision for negative member balance）
- [x] 10.7 實作 `GET /api/admin/reimbursements`（或掛在既有 admin 路徑下）：回傳所有核銷／補發決策，依 `createdAt` 降冪，含目標成員與操作管理者識別或顯示名稱（對應需求：Manager views reimbursement decision history）
- [x] 10.8 於 `admin/overview` 或 `admin/members` 為負餘額 MEMBER 提供「記錄核銷／補發」表單（reimbursed 勾選、creditAmount、note），呼叫 10.6 API；並以簡易列表或區塊顯示 10.7 之最近紀錄（對應需求：Manager records reimbursement decision for negative member balance；Manager views reimbursement decision history）
- [x] 10.9 手動驗證：導覽往返、團隊餘額加總與手算一致、標籤僅在 balance<0 出現、管理者自登支出扣管理者餘額、補發與拒絕兩路徑之餘額與 DB 列正確（對應上述需求與設計決策）
