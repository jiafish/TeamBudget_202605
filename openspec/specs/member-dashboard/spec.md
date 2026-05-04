# member-dashboard Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Member views own expense records by month

The system SHALL allow a MEMBER to view their own expense records filtered by calendar month. The default view SHALL show the current calendar month. Each record SHALL display: date, amount, description, and a receipt icon/link if a receipt is attached.

#### Scenario: View current month records

- **WHEN** a MEMBER opens their dashboard without specifying a month
- **THEN** the system displays all of that member's expense records for the current calendar month, ordered by date descending

#### Scenario: Navigate to a previous month

- **WHEN** a MEMBER selects a previous month from the month picker
- **THEN** the system displays only that member's expense records for the selected month

---
### Requirement: Member ledger balance via API

The system SHALL NOT display a dedicated ledger balance card on the MEMBER dashboard. The MEMBER's current ledger balance SHALL remain available via `GET /api/auth/me` in the `balance` field for clients that need it.

#### Scenario: Dashboard omits ledger balance card

- **WHEN** a MEMBER loads their dashboard
- **THEN** no separate account balance summary card is shown for ledger balance

#### Scenario: Balance still available from me endpoint

- **WHEN** a MEMBER calls `GET /api/auth/me` while authenticated
- **THEN** the response includes a numeric `balance` consistent with persisted user state

---
### Requirement: Member views budget summary on dashboard

The system SHALL display on the MEMBER dashboard a budget summary containing: (1) the MEMBER's current monthly stipend stored as `monthlyAllocation` (non-negative integer), with UI labeling that identifies it as the **monthly stipend** (the per-month allocation amount, not the lifetime credited sum); (2) total expense, the sum of all `ExpenseRecord.amount` for that MEMBER across all time; (3) a primary total labeled in the UI as **「分配經費＋補發加總」**, computed as the sum of all `MonthlyAllocationLog.amount` for that MEMBER plus the sum of `creditAmount` over all `ReimbursementDecision` rows where `targetUserId` equals that MEMBER's id and `reimbursed` is true; (4) **available balance**, computed as the primary total from (3) minus the total expense sum from (2). The authenticated member budget summary API SHALL return sufficient numeric fields for the client to render the breakdown (including at least the log sum and reimbursed supplement sum separately) and SHALL retrieve these values for the authenticated MEMBER only.

#### Scenario: Dashboard loads summary

- **WHEN** a MEMBER loads the dashboard
- **THEN** the budget summary displays the monthly stipend, total expense, the primary total consistent with server-side aggregation, and available balance consistent with server-side aggregation for that MEMBER

##### Example: Four months of equal allocation without supplements

- **GIVEN** MEMBER A has `monthlyAllocation` 4000 and `MonthlyAllocationLog` rows for months 2026-02, 2026-03, 2026-04, and 2026-05 each with `amount` 4000, zero reimbursed supplement credits, and the sum of all expense records for A equals 2000
- **WHEN** A views the budget summary in calendar month 2026-05
- **THEN** the monthly stipend field displays 4000
- **THEN** the primary total labeled 「分配經費＋補發加總」 displays 16000
- **THEN** total expense displays 2000
- **THEN** available balance displays 14000

##### Example: Logs plus reimbursed supplement credits

- **GIVEN** MEMBER A has `MonthlyAllocationLog` amounts summing to 8000 and `ReimbursementDecision` rows for A with `reimbursed` true and `creditAmount` values 1000 and 500, and total expense sum equals 3000
- **WHEN** A views the budget summary
- **THEN** the primary total labeled 「分配經費＋補發加總」 displays 9500
- **THEN** available balance displays 6500

#### Scenario: No allocation logs yet

- **GIVEN** a MEMBER has zero `MonthlyAllocationLog` rows, zero reimbursed supplement credits, and total expense sum 0
- **WHEN** the MEMBER loads the dashboard
- **THEN** the primary total displays 0
- **THEN** available balance displays 0


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
### Requirement: Member views reimbursement decision history on dashboard

The system SHALL allow a MEMBER to view a list of their own `ReimbursementDecision` records on the dashboard, ordered by `createdAt` descending (newest first). Each item in the API response SHALL include: `id`, `targetUserId`, `targetName`, `managerUserId`, `managerName`, `reimbursed`, `creditAmount`, `note`, and `createdAt` as an ISO-8601 timestamp string, matching the field names and semantics of the manager reimbursement listing API. The system SHALL NOT return decisions whose `targetUserId` differs from the authenticated MEMBER's user id.

#### Scenario: Member sees own supplement row

- **GIVEN** a `ReimbursementDecision` exists for MEMBER M with `reimbursed` true, positive `creditAmount`, and a known `managerName`
- **WHEN** M loads the dashboard reimbursement section
- **THEN** M sees a row containing that `creditAmount`, `reimbursed`, and `managerName`

#### Scenario: Empty reimbursement history

- **GIVEN** a MEMBER has zero `ReimbursementDecision` rows
- **WHEN** the MEMBER loads the dashboard
- **THEN** the reimbursement section renders without error and indicates there are no records


<!-- @trace
source: member-dashboard-budget-and-supplements
updated: 2026-05-04
code:
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - src/app/api/admin/summary/route.ts
  - src/app/api/member/reimbursements/route.ts
  - prisma/schema.prisma
  - tsconfig.tsbuildinfo
  - src/app/api/admin/members/[id]/allocation/route.ts
  - src/app/api/member/budget-summary/route.ts
  - src/app/dashboard/page.tsx
  - src/lib/allocation.ts
-->

---
### Requirement: Member cannot access other members' data

The system SHALL prevent a MEMBER from reading any data belonging to another user, including expense records, balance, monthly allocation configuration, aggregates of `MonthlyAllocationLog`, aggregates of `ExpenseRecord`, and `ReimbursementDecision` rows.

#### Scenario: Unauthorized expense or balance access by userId parameter

- **WHEN** a MEMBER requests expense records or balance information for a different user ID via any API route that accepts a user identifier
- **THEN** the system returns a 403 Forbidden response
- **THEN** no data from the other user is included in any response

#### Scenario: Member-scoped reimbursement history

- **WHEN** a MEMBER requests reimbursement history via the authenticated member reimbursement endpoint
- **THEN** every returned row has `targetUserId` equal to the MEMBER's own user id

#### Scenario: Member-scoped budget summary

- **WHEN** a MEMBER requests the budget summary via the authenticated member budget summary endpoint
- **THEN** the total expense figure SHALL equal the sum of that MEMBER's expense amounts only
- **THEN** every `MonthlyAllocationLog` amount included in aggregates SHALL belong to that MEMBER's user id only
- **THEN** every `ReimbursementDecision` amount included in the reimbursed supplement sum SHALL have `targetUserId` equal to that MEMBER's user id and `reimbursed` true only


<!-- @trace
source: member-dashboard-budget-and-supplements
updated: 2026-05-04
code:
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - src/app/api/admin/summary/route.ts
  - src/app/api/member/reimbursements/route.ts
  - prisma/schema.prisma
  - tsconfig.tsbuildinfo
  - src/app/api/admin/members/[id]/allocation/route.ts
  - src/app/api/member/budget-summary/route.ts
  - src/app/dashboard/page.tsx
  - src/lib/allocation.ts
-->

---
### Requirement: Member views own receipt

The system SHALL allow a MEMBER to view the receipt image for their own expense records.

#### Scenario: View own receipt

- **WHEN** a MEMBER clicks on a receipt link for one of their own expense records
- **THEN** the system serves the receipt image via an authenticated API route

#### Scenario: Access another member's receipt

- **WHEN** a MEMBER attempts to access a receipt URL belonging to a different user's record
- **THEN** the system returns a 403 Forbidden response