## Why

目前支出記錄只有金額、日期、說明與收據欄位，無法依用途（如設備、餐費、交通）貼標，管理者難以分析支出結構與預算分配是否合理。

## What Changes

- 新增「支出類別」功能：管理者可建立、刪除類別（如設備、餐費、差旅）
- 類別為選填標籤，成員提交支出時可選擇一個類別，也可不選
- 管理者總覽可依類別篩選支出，篩選選項包含「未標示」（查看未貼標記錄）
- 資料庫新增 `Category` 模型，`ExpenseRecord` 新增可空的 `categoryId` 欄位

## Non-Goals (optional)

（本變更將建立 design.md，Non-Goals 留於 design.md 中記錄）

## Capabilities

### New Capabilities

- `expense-category`: 支出類別的管理（建立、刪除）與選擇，涵蓋管理者 API 及成員提交表單的類別選單

### Modified Capabilities

- `expense-record`: 支出提交新增選填的類別標籤欄位；管理者查詢支出記錄時可依類別篩選（含「未標示」）

## Impact

- Affected specs: `expense-category`（新增）、`expense-record`（修改）
- Affected code:
  - New: `src/app/api/admin/categories/route.ts`, `src/app/api/admin/categories/[id]/route.ts`
  - Modified: `prisma/schema.prisma`, `src/app/api/expenses/route.ts`, `src/app/components/ExpenseForm.tsx`, `src/app/admin/overview/page.tsx`, `src/app/admin/members/page.tsx`
  - Removed: (none)
