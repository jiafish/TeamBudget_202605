# manager-overview Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Manager views all members' expense records

The system SHALL provide a MANAGER with a paginated, month-filterable list of all expense records across all members. Each record in the list SHALL display: member name (登記人), amount, date, description, and a link to the receipt image if present. The default view SHALL show the current calendar month.

#### Scenario: View current month overview

- **WHEN** a MANAGER opens the overview page without specifying a month filter
- **THEN** the system displays all expense records for the current calendar month, ordered by date descending
- **THEN** each record shows the member's name, amount, date, and description

#### Scenario: Filter by a specific month

- **WHEN** a MANAGER selects month 2025-03 from the month picker
- **THEN** the system displays only records where the expense date falls within March 2025

---
### Requirement: Manager views per-member balance summary

The system SHALL provide a MANAGER with a summary of every non-deleted user account (i.e. accounts whose `deletedAt` is null) showing each user's name, `monthlyAllocation`, and a **displayed remaining amount** computed as the sum of that user's `MonthlyAllocationLog.amount` values plus the sum of `creditAmount` for `ReimbursementDecision` rows where `targetUserId` equals that user's id and `reimbursed` is true, minus the sum of `ExpenseRecord.amount` across all expense rows whose `userId` equals that user's id (lifetime total expenses for that user). The summary SHALL NOT use `User.balance` as the source of truth for the displayed remaining amount column.

The balance summary table SHALL NOT include a per-row "set allocation" action. Allocation management is performed exclusively from the members management page.

#### Scenario: Balance summary table excludes deleted members

- **WHEN** a MANAGER views the balance summary
- **THEN** only non-deleted members (whose `deletedAt` is null) appear in the table

#### Scenario: Balance summary table uses formula

- **WHEN** the MANAGER views the balance summary table
- **THEN** the displayed remaining amount for each user equals the sum of their `MonthlyAllocationLog` amounts plus credited reimbursements minus lifetime expenses
- **THEN** the table does not show a "set allocation" action per row

##### Example: displayed remaining calculation

- **GIVEN** member A has `MonthlyAllocationLog` amounts summing to 15000, reimbursements with `reimbursed=true` and `creditAmount` summing to 2000, and total `ExpenseRecord.amount` summing to 8000
- **WHEN** the balance summary is rendered
- **THEN** member A's displayed remaining amount is 9000 (15000 + 2000 − 8000)


<!-- @trace
source: member-management-enhancement
updated: 2026-05-05
code:
  - src/lib/prisma.ts
  - src/app/api/admin/summary/route.ts
  - package.json
  - src/app/api/admin/categories/route.ts
  - src/app/api/admin/expenses/route.ts
  - README.md
  - prisma/migrations/migration_lock.toml
  - src/app/api/expenses/route.ts
  - src/app/components/ExpenseForm.tsx
  - src/app/api/admin/categories/[id]/route.ts
  - src/app/api/auth/demo-login/route.ts
  - src/app/dashboard/page.tsx
  - src/app/api/member/budget-summary/route.ts
  - src/lib/allocation.ts
  - src/app/admin/members/page.tsx
  - tsconfig.tsbuildinfo
  - prisma/migrations/20260503150439_init/migration.sql
  - scripts/gh-pages-build.cjs
  - src/app/static-home.tsx
  - src/app/api/member/reimbursements/route.ts
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260503161647_add_reimbursement_decision/migration.sql
  - src/app/api/admin/members/route.ts
  - src/app/api/auth/login/route.ts
  - src/app/page.tsx
  - next.config.ts
  - src/app/api/admin/reimbursements/route.ts
  - src/app/api/admin/members/[id]/allocation-history/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - .github/workflows/gh-pages.yml
  - prisma/schema.prisma
  - src/app/api/admin/members/[id]/route.ts
  - src/app/login/page.tsx
-->

---
### Requirement: Manager views aggregate expense statistics

The system SHALL display aggregate statistics for the selected month: total amount spent across all members, and a per-member breakdown of total spending for that month.

#### Scenario: Monthly aggregate

- **WHEN** a MANAGER views the overview for month 2025-05
- **THEN** the system shows the sum of all expense amounts for that month
- **THEN** the system shows each member's individual total spending for that month

##### Example: aggregate calculation

- **GIVEN** member A spent 1200 in May; member B spent 800 in May; member C spent 0 in May
- **WHEN** MANAGER views the May overview
- **THEN** total displayed is 2000; member A shows 1200, member B shows 800, member C shows 0

---
### Requirement: Manager views receipt image

The system SHALL allow a MANAGER to view the receipt image linked to any expense record.

#### Scenario: View receipt

- **WHEN** a MANAGER clicks on a receipt link in the expense list
- **THEN** the system serves the receipt image through an authenticated API route
- **THEN** a MEMBER who is not the record owner receives a 403 response when attempting the same URL

---
### Requirement: Manager member administration page includes consistent navigation

The system SHALL render the same primary navigation header on the member administration page as on the admin overview page, including links to `/admin/overview`, `/admin/members`, and a logout control, so a MANAGER can return to the overview without using the browser back button.

#### Scenario: Navigate from member administration to overview

- **WHEN** a MANAGER opens the member administration page
- **THEN** the page displays a navigation control that navigates to the admin overview route
- **THEN** the navigation matches the overview page's admin navigation pattern (overview link, members link, logout)

---
### Requirement: Manager views team cumulative remaining balance

The system SHALL compute the **team displayed cumulative remaining balance** as the sum of all `MonthlyAllocationLog.amount` values in the system plus the sum of all `ReimbursementDecision.creditAmount` values where `reimbursed` is true, minus the sum of every `ExpenseRecord.amount` in the system (all members and the MANAGER). The admin overview SHALL display this value in the primary dashboard hero area alongside the **team total historical spend**, defined as the sum of all `ExpenseRecord.amount` values in the system, with labeling that distinguishes the team displayed cumulative remaining balance from the team total historical spend.

#### Scenario: Team displayed sum matches formula

- **GIVEN** the sum of all `MonthlyAllocationLog.amount` values is 7000, the sum of all reimbursed supplement `creditAmount` values is 500, and the sum of all `ExpenseRecord.amount` values is 4000
- **WHEN** a MANAGER views the admin overview
- **THEN** the displayed team displayed cumulative remaining balance is 7000 plus 500 minus 4000, i.e., 3500

---
### Requirement: Member balance summary shows reimbursement-needed label

The system SHALL display the literal label text `需補發經費` on the per-user balance summary row when that row's **displayed remaining amount** (computed as summed allocation logs plus summed reimbursed supplement credits minus lifetime summed expenses for that user) is strictly less than zero, in addition to any existing negative styling for that row.

#### Scenario: Negative displayed remaining shows label

- **WHEN** a member row's displayed remaining amount is -1 or lower
- **THEN** the row includes the visible text `需補發經費`

#### Scenario: Non-negative displayed remaining hides label

- **WHEN** a member row's displayed remaining amount is 0 or greater
- **THEN** the row does not display the `需補發經費` label

---
### Requirement: Manager submits own expense from admin overview

The system SHALL provide MANAGER-only expense submission controls on the admin overview page that submit through the same `POST /api/expenses` endpoint used by members, so the expense is recorded against the MANAGER's user account and decrements the MANAGER's balance. These controls SHALL be placed inside the **登錄支出** tab located below the balance summary (tabbed region), not in the primary dashboard hero metrics section.

#### Scenario: Manager posts own expense from overview

- **WHEN** a MANAGER selects the **登錄支出** tab and submits a valid expense form
- **THEN** the system creates an `ExpenseRecord` with `userId` equal to the MANAGER's user id
- **THEN** the MANAGER's `balance` is decremented by the expense amount atomically

---
### Requirement: Manager overview dashboard hero shows team total historical spend and team displayed balance

The system SHALL render, as the first primary content section on the admin overview page, both of the following values: (1) the **team total historical spend**, defined as the sum of all `ExpenseRecord.amount` values system-wide (the same aggregate as `totals.sumTotalExpense` from the MANAGER summary API), and (2) the **team displayed cumulative remaining balance** as defined in the modified team cumulative requirement. The hero section SHALL NOT include a month picker for these two metrics. The section SHALL label each value so a MANAGER can distinguish lifetime total spend from the lifetime allocation-minus-expense balance.

#### Scenario: Hero shows lifetime totals only

- **WHEN** a MANAGER views the admin overview hero metrics
- **THEN** the displayed team total historical spend equals the sum of every expense record amount in the database
- **THEN** the displayed team displayed cumulative remaining balance equals the sum of all `MonthlyAllocationLog.amount` values plus the sum of all reimbursed supplement credits minus that summed expense total

---
### Requirement: Manager overview primary tabs below balance summary

The system SHALL render, directly below the per-member balance summary table, a tab control with exactly three tabs labeled for MANAGER consumption as **月份支出統計**, **核銷補發**, and **登錄支出**. Exactly one tab panel SHALL be visible at a time based on the active tab selection.

#### Scenario: Three tabs exist

- **WHEN** a MANAGER views the admin overview below the balance summary
- **THEN** three selectable tabs are visible with the specified labels

---
### Requirement: Month statistics tab content

When the **月份支出統計** tab is active, the system SHALL display a month selector, the total expense amount for the selected calendar month across all users, a per-member spending breakdown for that month, and the full list of expense records for that month (date, member, amount, description, receipt access), using the same month parameter that drives `GET /api/admin/expenses?month=`.

#### Scenario: Changing month updates tab content

- **WHEN** a MANAGER selects month 2025-04 within the **月份支出統計** tab
- **THEN** the displayed monthly total and record list include only expenses whose dates fall in April 2025

---
### Requirement: Reimbursement tab content

When the **核銷補發** tab is active, the system SHALL display the manual supplemental credit form and the reimbursement decision history table in the same view (stacked vertically or an equivalent layout that keeps both discoverable without leaving the tab).

#### Scenario: Manual form and history in reimbursement tab

- **WHEN** a MANAGER selects the **核銷補發** tab
- **THEN** both the manual supplemental credit form and the reimbursement history table are visible within that tab

---
### Requirement: Manual supplemental credit form on admin overview

The system SHALL provide MANAGER-only controls on the admin overview page to submit a manual supplemental credit consisting of a target user selector, a positive integer credit amount, and an optional note. Submission SHALL call a dedicated MANAGER-only API that persists the credit as a reimbursement decision row and increments the target user's `balance`, then refreshes overview data so the decision appears in the reimbursement history list.

#### Scenario: Successful manual supplemental submission

- **WHEN** a MANAGER selects an existing member, enters credit amount 1500, optionally enters a note, and submits the manual supplemental form
- **THEN** the system returns success and a new reimbursement decision row exists with `reimbursed=true` and `creditAmount=1500` for that target
- **THEN** the target user's `balance` increases by 1500

---
### Requirement: Reimbursement-needed control activates reimbursement tab and manual supplemental form

The system SHALL treat the `需補發經費` label as an interactive control. When a MANAGER activates the control on a member row, the system SHALL first activate the **核銷補發** tab, then SHALL scroll the manual supplemental credit form into view, and SHALL pre-select that member as the target user in the form.

#### Scenario: Click label switches tab scrolls and preselects

- **WHEN** a MANAGER clicks the `需補發經費` label on member row R
- **THEN** the **核銷補發** tab becomes the active tab if it was not already
- **THEN** the manual supplemental credit form becomes visible in the viewport without requiring a full page navigation
- **THEN** the target user selector is set to member R

---
### Requirement: Manager sets member monthly allocation from overview with optional backfill month range

The system SHALL provide on the **member administration page** (`/admin/members` or equivalent) controls for a MANAGER to update each member's `monthlyAllocation` through the manager allocation update API (`PUT /api/admin/members/:id/allocation` or equivalent). The admin overview balance summary page SHALL NOT expose the primary **設定分配** control that opens this update flow from each member row (a navigation link to the member administration page is permitted). The editing UI SHALL include the monthly amount field and two optional month fields for an inclusive backfill range, each representing a calendar month in `YYYY-MM` form. When the editing UI opens for a member, it SHALL pre-populate the monthly amount with that member's current `monthlyAllocation` and SHALL pre-populate the optional range fields from the latest `MemberAllocationSettingLog` requested backfill months when both requested values are non-null; when either requested value on the latest audit row is `null`, the optional fields SHALL start empty so that, unless the manager enters a new pair, the client omits both `backfillFromMonth` and `backfillToMonth` on save. When both optional fields are empty at save time, the client SHALL omit `backfillFromMonth` and `backfillToMonth` from the JSON body. When both are set, the client SHALL include both properties with the chosen values. The client SHALL NOT submit a request body that includes exactly one of `backfillFromMonth` or `backfillToMonth`. The manager SHALL be able to change any pre-populated value before saving.

#### Scenario: Save positive allocation without optional range

- **WHEN** a MANAGER enters a new positive `monthlyAllocation` and leaves both optional backfill month fields empty on the member administration allocation form
- **THEN** the submitted request body contains no `backfillFromMonth` or `backfillToMonth` properties

#### Scenario: Save positive allocation with both optional range bounds

- **WHEN** a MANAGER sets the optional start month to 2026-03 and the optional end month to 2026-04 on the member administration allocation form and saves a positive allocation
- **THEN** the submitted request body includes `backfillFromMonth` equal to 2026-03 and `backfillToMonth` equal to 2026-04

#### Scenario: Configure February through fifth month at 5000 per month while current calendar month is April

- **GIVEN** member A exists, the server's current calendar month is April of year Y, and the manager uses the member administration allocation form in April
- **WHEN** the manager sets `monthlyAllocation` to 5000, sets optional start month to Y-02 and optional end month to Y-05, and saves successfully
- **THEN** the system creates or preserves `MonthlyAllocationLog` rows as required by the backfill policy for months Y-02, Y-03, Y-04, and Y-05 for member A so that credited past months inside that window are reflected in that member's lifetime `MonthlyAllocationLog` sum and in the MEMBER dashboard primary total that includes allocation logs

#### Scenario: Overview row has no primary allocation edit control

- **WHEN** a MANAGER views the admin overview balance summary row actions for a member
- **THEN** there is no primary inline control that opens the allocation update modal from that overview row labeled as the allocation save flow (for example no 「設定分配」 button on that row)


<!-- @trace
source: monthly-allocation-audit-ui
updated: 2026-05-04
code:
  - src/lib/allocation.ts
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - src/app/dashboard/page.tsx
  - src/app/admin/overview/page.tsx
  - src/app/api/admin/summary/route.ts
  - src/app/api/member/budget-summary/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - prisma/schema.prisma
  - tsconfig.tsbuildinfo
  - src/app/api/member/reimbursements/route.ts
-->

---
### Requirement: Manager views allocation setting audit history from admin overview

The system SHALL expose, for each member listed in the MANAGER admin overview balance summary, an ordered list of allocation audit rows (newest first) sourced from the persistent audit store for allocation updates (`MemberAllocationSettingLog` or equivalent). Each list element SHALL include: requested backfill start month or `null`, requested backfill end month or `null`, effective backfill start month or `null`, effective backfill end month or `null`, the saved `monthlyAllocation` value after that update, `backfilledMonthsCount`, `createdAt` as an ISO-8601 timestamp string, and the acting manager's display name. The admin overview SHALL provide a per-member control that reveals this full list (expand region, button opening a modal, or equivalent). The balance summary primary table SHALL NOT include a dedicated column whose only purpose is to display the single most recent requested and effective month pair inline for that member.

#### Scenario: Two audit rows appear newest first

- **GIVEN** member M has audit row A at time T1 with `monthlyAllocationAfter` 3000 and both requested months `null`, and audit row B at time T2 after T1 with requested months 2026-02 and 2026-03 and effective months 2026-02 and 2026-03
- **WHEN** a MANAGER opens the audit history control for member M
- **THEN** row B is listed before row A
- **THEN** each listed row includes requested bounds, effective bounds, saved allocation after the change, `backfilledMonthsCount`, ISO timestamp, and manager display name fields available to the client

#### Scenario: Primary balance table has no inline-only-last-range column

- **WHEN** a MANAGER views the balance summary primary table layout
- **THEN** that table does not use a column whose sole responsibility is showing only the latest requested and effective month pair for each member in the main grid

<!-- @trace
source: monthly-allocation-audit-ui
updated: 2026-05-04
code:
  - src/lib/allocation.ts
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - src/app/dashboard/page.tsx
  - src/app/admin/overview/page.tsx
  - src/app/api/admin/summary/route.ts
  - src/app/api/member/budget-summary/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - prisma/schema.prisma
  - tsconfig.tsbuildinfo
  - src/app/api/member/reimbursements/route.ts
-->