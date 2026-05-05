# expense-record Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Member submits an expense record

The system SHALL allow any authenticated user (MANAGER or MEMBER) to submit an expense record against their own account. An expense record SHALL include: amount (positive integer, in whole currency units), date (user-specified, not required to be today), description (non-empty string), and optionally a receipt image file. The system SHALL also accept an optional categoryId; if provided, it SHALL reference an existing Category or be rejected with 400 Bad Request. If categoryId is omitted or null, the record is stored with categoryId=null. Upon submission, the system SHALL atomically deduct the amount from the user's balance.

#### Scenario: Successful expense submission without category

- **WHEN** a user submits a valid expense record with amount=500, date, description, and no categoryId
- **THEN** the system creates an ExpenseRecord with categoryId=null linked to the user
- **THEN** the user's balance is decremented by 500 atomically
- **THEN** the record appears in the user's monthly record list immediately

#### Scenario: Successful expense submission with category

- **WHEN** a user submits a valid expense record with amount=500, date, description, and a categoryId referencing an existing Category
- **THEN** the system creates an ExpenseRecord linked to the user and the category
- **THEN** the user's balance is decremented by 500 atomically
- **THEN** the record appears in the user's monthly record list with the category name included

#### Scenario: Expense exceeds balance

- **WHEN** a user submits an expense with an amount greater than their current balance
- **THEN** the system SHALL still accept and record the expense (negative balance is permitted)
- **THEN** the user's balance is decremented, resulting in a negative value if applicable

#### Scenario: Invalid amount

- **WHEN** a user submits an expense with amount=0 or a negative number
- **THEN** the system rejects the request with a validation error
- **THEN** no record is created and no balance change occurs

#### Scenario: Expense submitted with a non-existent categoryId

- **WHEN** a user submits an expense with a categoryId that does not match any existing Category
- **THEN** the system returns 400 Bad Request
- **THEN** no ExpenseRecord is created and no balance change occurs


<!-- @trace
source: expense-categories
updated: 2026-05-05
code:
  - src/app/api/admin/summary/route.ts
  - prisma/migrations/20260504144357_add_expense_categories/migration.sql
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - tsconfig.tsbuildinfo
  - package.json
  - scripts/gh-pages-build.cjs
  - src/app/components/ExpenseForm.tsx
  - src/app/api/admin/categories/[id]/route.ts
  - src/app/api/admin/categories/route.ts
  - src/app/api/admin/expenses/route.ts
  - next.config.ts
  - src/app/login/page.tsx
  - src/app/admin/members/page.tsx
  - src/app/static-home.tsx
  - prisma/schema.prisma
  - src/app/api/member/budget-summary/route.ts
  - src/app/api/member/reimbursements/route.ts
  - prisma/migrations/20260505012240_add_user_soft_delete/migration.sql
  - src/app/api/expenses/route.ts
  - src/app/api/admin/members/[id]/route.ts
  - src/lib/allocation.ts
  - src/app/dashboard/page.tsx
  - src/app/page.tsx
  - .github/workflows/gh-pages.yml
  - src/app/api/admin/members/[id]/allocation/route.ts
-->

---
### Requirement: Receipt image upload

The system SHALL accept receipt image uploads in JPEG, PNG, or WebP format, with a maximum file size of 10 MB. The system SHALL store the file on the server and associate the file path with the expense record. The system SHALL serve receipt images only to authenticated users who are either the record owner or a MANAGER.

#### Scenario: Valid receipt upload

- **WHEN** a user submits an expense with a JPEG image of 2 MB
- **THEN** the system stores the file and links it to the expense record
- **THEN** the receipt is accessible via an authenticated API route

#### Scenario: Receipt exceeds size limit

- **WHEN** a user submits a receipt file larger than 10 MB
- **THEN** the system rejects the upload with an error message
- **THEN** no expense record is created

#### Scenario: Unsupported file type

- **WHEN** a user uploads a file with a .pdf or .docx extension as a receipt
- **THEN** the system rejects the upload with an error indicating only JPEG/PNG/WebP are accepted

---
### Requirement: Expense records are immutable

The system SHALL NOT allow any user (including MANAGER) to edit or delete an existing expense record after submission.

#### Scenario: Edit attempt blocked

- **WHEN** any user attempts to modify or delete an existing expense record via any API route
- **THEN** the system returns a 403 Forbidden response

---
### Requirement: Expense records are filtered by month

The system SHALL allow users to retrieve their expense records filtered by calendar month (YYYY-MM). The month filter SHALL be based on the user-specified `date` field of the record, not the `createdAt` timestamp.

#### Scenario: Filter by month

- **WHEN** a user requests expense records for month 2025-05
- **THEN** the system returns only records where the date field falls within May 2025
- **THEN** records from other months are excluded

##### Example: month boundary

| Record date | Filter month | Included? |
|-------------|--------------|-----------|
| 2025-05-01  | 2025-05      | Yes       |
| 2025-05-31  | 2025-05      | Yes       |
| 2025-06-01  | 2025-05      | No        |
| 2025-04-30  | 2025-05      | No        |