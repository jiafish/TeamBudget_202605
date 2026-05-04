## 1. 資料庫與 Migration

- [x] 1.1 依照設計文件的「Category 模型設計」，在 `prisma/schema.prisma` 新增 `Category` 模型（欄位：`id` 自動遞增主鍵、`name` unique 字串、`createdAt`），並在 `ExpenseRecord` 新增可空外鍵 `categoryId Int?` 與對應 relation
- [x] 1.2 依照設計文件的「Migration 策略」，建立 Prisma migration：僅新增 nullable `categoryId` 欄位，無需 backfill，現有記錄自動為 null（視同「未標示」）

## 2. 管理者類別 API（Admin manages expense categories）

- [x] 2.1 實作 `GET /api/admin/categories`（涵蓋規格 Admin manages expense categories）：回傳所有 Category 記錄（id、name），MANAGER 與 MEMBER 皆可存取（以填充表單選單），無身份驗證者回傳 401
- [x] 2.2 實作 `POST /api/admin/categories`：僅限 MANAGER；接收 `name` 欄位建立新類別；name 重複時回傳 409 Conflict；name 為空時回傳 400；成功時回傳新建類別的 id 與 name
- [x] 2.3 實作 `DELETE /api/admin/categories/[id]`：依照設計文件的「刪除類別的行為」，僅限 MANAGER；若該類別有 ExpenseRecord 引用則回傳 409 Conflict；類別不存在時回傳 404；成功時回傳 200

## 3. 支出 API 更新（Member submits an expense record / Admin can filter expenses by category including unlabeled）

- [x] 3.1 更新 `POST /api/expenses`（涵蓋規格 Member submits an expense record）：接受選填的 `categoryId`（支援 multipart form data 與 JSON 兩種路徑）；若有傳則驗證 Category 存在，否則回傳 400；未傳或為 null 則存為 null；回傳記錄一併 include category name
- [x] 3.2 更新 `GET /api/admin/expenses`（涵蓋規格 Admin can filter expenses by category including unlabeled、設計決策管理者篩選含「未標示」）：支援可選的 `categoryId` query 參數；參數為整數時篩選特定類別，為字串 `"null"` 時篩選 `categoryId IS NULL`，無參數時回傳全部；每筆記錄 include category name（無類別時為 null）

## 4. 管理者類別管理 UI

- [x] 4.1 在管理者頁面（`src/app/admin/overview/page.tsx`）新增類別管理區塊：顯示現有類別列表，提供「新增類別」輸入框與送出按鈕（呼叫 `POST /api/admin/categories`）；若無任何類別，顯示「尚無類別，請先新增」提示
- [x] 4.2 在類別列表每一項顯示刪除按鈕，點擊後呼叫 `DELETE /api/admin/categories/[id]`；若 API 回傳 409（有關聯支出），顯示「此類別已有支出記錄，無法刪除」提示

## 5. 支出表單更新（Member may optionally select a category when submitting an expense）

- [x] 5.1 更新 `src/app/components/ExpenseForm.tsx`（涵蓋規格 Member may optionally select a category when submitting an expense）：新增「類別」下拉選單，頁面載入時呼叫 `GET /api/admin/categories` 填充選項；第一個選項為「不選」（value=""，送出時不帶 categoryId）；表單送出時若有選擇則將 categoryId 一併傳送
- [x] 5.2 更新成員儀表板（`src/app/dashboard/page.tsx`）的支出記錄列表，顯示每筆支出的類別名稱（無類別時顯示「—」）

## 6. 管理者總覽篩選（Admin can filter expenses by category including unlabeled）

- [x] 6.1 更新 `src/app/admin/overview/page.tsx` 支出記錄頁籤：新增類別篩選下拉選單，選項包含「全部」、各類別名稱、及「未標示」；選擇後以對應 `categoryId` 參數（整數或字串 `"null"`）重新呼叫 `GET /api/admin/expenses`；支出記錄列顯示類別名稱
- [x] 6.2 更新 `src/app/admin/members/page.tsx`：在成員支出記錄列中顯示類別名稱（無類別時顯示「—」）

## 7. 類別管理 UI 搬移至成員管理頁

- [x] 7.1 從 `src/app/admin/overview/page.tsx` 移除類別管理的所有相關程式碼：刪除 `Category` interface（若僅供此用途）、state（`categories`、`newCategoryName`、`categoryError`）、`fetchCategories` callback、`useEffect` 呼叫 `fetchCategories`、`handleCreateCategory` function、`handleDeleteCategory` function、以及「支出類別管理」`<section>` UI 區塊；保留 `categoryFilter` state 與篩選下拉選單（類別列表仍需從 API 取得，改由獨立 fetch 在篩選下拉選單掛載時呼叫）
- [x] 7.2 在 `src/app/admin/members/page.tsx` 加入類別管理功能：新增 `Category` interface；新增 state（`categories`、`newCategoryName`、`categoryError`）；新增 `fetchCategories` useCallback（呼叫 `GET /api/admin/categories`，在 useEffect 中掛載）；新增 `handleCreateCategory`（POST `/api/admin/categories`，成功後呼叫 `fetchCategories`）；新增 `handleDeleteCategory`（DELETE `/api/admin/categories/[id]`，409 時顯示「此類別已有支出記錄，無法刪除」，成功後呼叫 `fetchCategories`）；在頁面底部加入「支出類別管理」section，結構與原 overview 頁相同（新增輸入框 + 送出按鈕、類別列表含刪除按鈕、空狀態提示「尚無類別，請先新增」）
