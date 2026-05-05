# 團隊經費管理工具

輕量網頁工具，管理團隊成員的每月經費分配與支出記錄。

## 技術棧

- **前後端**：Next.js 16 App Router（TypeScript）
- **資料庫**：SQLite（Prisma ORM）
- **認證**：JWT（httpOnly cookie，7 天有效）

## 快速開始（本機開發）

```bash
# 安裝依賴
npm install

# 設定環境變數
cp .env.local.example .env.local
# 編輯 .env.local，設定 JWT_SECRET 和 CRON_SECRET

# 初始化資料庫
DATABASE_URL="file:./dev.db?connection_limit=1" npx prisma migrate dev --name init

# 建立預設管理者帳號（loginNumber=admin, password=admin123）
DATABASE_URL="file:./dev.db?connection_limit=1" npx tsx prisma/seed.ts

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往 http://localhost:3000

## 環境變數

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | SQLite 資料庫路徑，例如 `file:./dev.db?connection_limit=1` |
| `JWT_SECRET` | JWT 簽名金鑰，生產環境請使用隨機長字串 |
| `CRON_SECRET` | Cron 端點保護金鑰 |
| `DEMO_MODE` | 設為 `true` 啟用展示模式（伺服器端）：跳過登入頁、所有 admin API 回傳靜態 mock 資料，不需資料庫 |
| `NEXT_PUBLIC_DEMO_MODE` | 設為 `true` 啟用展示模式（客戶端）：admin 頁面偵測到未登入時自動取得 demo session，須與 `DEMO_MODE` 同時設定 |

## VPS 部署

### Docker 部署（推薦）

```bash
docker build -t team-budget .

docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/prod.db?connection_limit=1" \
  -e JWT_SECRET="your-secret-here" \
  -e CRON_SECRET="your-cron-secret-here" \
  -v /path/to/data:/app/data \
  -v /path/to/uploads:/app/uploads \
  --name team-budget \
  team-budget

# 初始化資料庫（首次）
docker exec team-budget sh -c "DATABASE_URL='file:./data/prod.db?connection_limit=1' npx prisma migrate deploy"
docker exec team-budget sh -c "DATABASE_URL='file:./data/prod.db?connection_limit=1' npx tsx prisma/seed.ts"
```

### 月初自動發放（系統 Cron）

在 VPS 上設定系統 cron（每月 1 日 00:00 執行）：

```
0 0 1 * * curl -s -X POST -H "x-cron-secret: your-cron-secret-here" http://localhost:3000/api/cron/monthly-allocation
```

設定方式：
```bash
crontab -e
# 加入上方那行
```

## 預設帳號

首次部署後：
- **登入號碼**：`admin`
- **密碼**：`admin123`

**請在首次登入後立即修改密碼。**

## 角色說明

| 角色 | 功能 |
|------|------|
| 管理者 | 建立成員帳號、設定月分配金額、查看所有支出記錄、手動補發經費 |
| 成員 | 登錄自己的支出記錄、查看自己的餘額與記錄 |
