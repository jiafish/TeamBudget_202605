## Context

本專案以 Next.js App Router + Prisma + SQLite 實作。目前 `ExpenseRecord` 模型無類別欄位，成員提交支出只能以純文字描述說明用途，管理者無法依類別篩選支出。本次變更新增 `Category` 模型，並在 `ExpenseRecord` 加入可空的 `categoryId` 外鍵，作為選填標籤。

## Goals / Non-Goals

**Goals:**

- 管理者可建立與刪除支出類別（名稱不可重複）
- 成員提交支出時可選擇類別（選填，可不選）
- 管理者總覽可依類別篩選支出，篩選選項包含「未標示」以查看無類別記錄

**Non-Goals:**

- 不支援類別重新命名（刪除後重建即可）
- 不支援多層級類別（一層平面列表即可）
- 不支援成員自行新增類別
- 不新增類別統計圖表（篩選即可，圖表留待未來）
- 不強制舊記錄補填類別（nullable，不 backfill）

## Decisions

### Category 模型設計

採用獨立的 `Category` 模型，以 `id`（自動遞增整數）為主鍵，`name` 欄位設 unique 約束避免重複。`ExpenseRecord.categoryId` 為可空外鍵（`Int?`），無類別記錄 `categoryId` 為 null。

**替代方案**：直接在 `ExpenseRecord` 存 `category` 字串 → 無法統一管理類別名稱，篩選時需字串比對，不選。

### Migration 策略

僅新增 nullable `categoryId Int?` 欄位至 `ExpenseRecord`，所有現有記錄自動為 null（視同「未標示」）。不需要預設類別或 backfill。

**替代方案**：categoryId 設為必填 + 預設類別 seed → 強迫舊記錄被歸類，但類別定義為選填標籤，不應強制，不選。

### 刪除類別的行為

若該類別已有 `ExpenseRecord` 引用（categoryId 等於該 id），禁止刪除（回傳 409 Conflict），避免資料孤立。支出記錄不可修改，因此被引用的類別也不可刪除。

**替代方案**：刪除時將引用記錄的 categoryId 改為 null → 違反記錄不可變原則，不選。

### 管理者類別 API

新增 `GET/POST /api/admin/categories`（列表與新增）與 `DELETE /api/admin/categories/[id]`（刪除），僅 MANAGER 可存取。`GET /api/admin/categories` 同時開放 MEMBER 存取以填充表單選單。

### 管理者篩選含「未標示」

`GET /api/admin/expenses` 的 `categoryId` query 參數接受三種狀態：無參數（全部）、整數 id（篩選特定類別）、字串 `"null"`（篩選 categoryId 為 null 的記錄）。

## Risks / Trade-offs

- [風險] SQLite 在 alter column 能力有限 → 緩解：使用 `prisma migrate dev` 標準流程，Prisma 自動處理 nullable 欄位新增
- [風險] 類別列表為空時，下拉選單只有「不選」一個選項，體驗較差 → 緩解：管理者 UI 需在無類別時顯示提示，引導建立類別；空選單不影響提交（選填）
