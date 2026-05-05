# budget-allocation Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Manager sets monthly allocation per member

The system SHALL allow a MANAGER to set a value stored as `monthlyAllocation` (in whole currency units, minimum 0) for any non-deleted member via the members management page (not the overview page). That value is the **monthly stipend**: the fixed amount the system credits for each calendar month that receives an allocation for that member through the scheduled monthly job or through manager-triggered backfill rules. It is not the lifetime sum of credits. A member with `monthlyAllocation` of 0 receives no automatic allocation credits from those mechanisms.

The members management page SHALL display the allocation setting action per member row. When a MANAGER opens the allocation modal for a member, the system SHALL fetch and display the most recent allocation setting (amount and requested backfill month bounds) from the member's allocation history so the manager can review it before making changes.

#### Scenario: Set allocation for a member from the members management page

- **WHEN** a MANAGER clicks the allocation action in the members management page for a member and submits a new positive allocation amount
- **THEN** the system saves the new stipend value
- **THEN** the system applies the missing-month backfill using that saved positive integer as the credited amount for each newly created month row

#### Scenario: Modal displays most recent allocation setting on open

- **WHEN** a MANAGER opens the allocation modal for a member who has at least one prior allocation setting
- **THEN** the modal displays the most recent `monthlyAllocationAfter` and the associated `requestedBackfillFromMonth` and `requestedBackfillToMonth` values from the latest audit row

#### Scenario: Set allocation to zero

- **WHEN** a MANAGER sets a member's `monthlyAllocation` to 0
- **THEN** the member receives no automatic allocation on future month-starts
- **THEN** the member's existing balance is not affected
- **THEN** the system does not create new `MonthlyAllocationLog` rows as part of the backfill policy for that update


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

<!-- @trace
source: member-management-enhancement
updated: 2026-05-04
-->

---
### Requirement: Backfill missing allocation months when manager sets positive monthly allocation

When a MANAGER updates a member's `monthlyAllocation` to a positive integer via the manager allocation update API, the system SHALL, after validation passes and the new allocation value is persisted, compute the inclusive set of calendar months `B` for which the system SHALL evaluate missing `MonthlyAllocationLog` rows. Let `C` be the inclusive range from the member account's creation calendar month through the server's current calendar month (using the same month boundary rules as the existing scheduled allocation job).

- If the request body omits both `backfillFromMonth` and `backfillToMonth`, then `B` SHALL be exactly the set of months in `C`.
- If the request body includes both `backfillFromMonth` and `backfillToMonth`, each SHALL be a `YYYY-MM` string, SHALL satisfy `backfillFromMonth <= backfillToMonth`, and `B` SHALL be the intersection of `C` with the inclusive range from `backfillFromMonth` through `backfillToMonth`.

If exactly one of `backfillFromMonth` or `backfillToMonth` is present, or either value is not a valid `YYYY-MM`, or `backfillFromMonth > backfillToMonth`, the system SHALL respond with HTTP 400 and SHALL NOT change the member's stored `monthlyAllocation` for that request.

For every month in `B`, if no `MonthlyAllocationLog` row exists for that member and month, the system SHALL atomically create exactly one `MonthlyAllocationLog` with `amount` equal to the newly saved `monthlyAllocation` and increment that member's `balance` by the same amount. Months that already have a `MonthlyAllocationLog` SHALL be skipped. If `B` is empty, the system SHALL still persist the new positive `monthlyAllocation` when the request is otherwise valid, and SHALL create no new `MonthlyAllocationLog` rows for this backfill step.

The system SHALL guarantee idempotency for this backfill: repeating the same update request SHALL NOT create duplicate logs for the same month or double-increment `balance` for a month that already has a log.

Any aggregate that represents **lifetime credited allocation** for a member SHALL be computed as the sum of all `MonthlyAllocationLog.amount` for that member and SHALL include every month row created for past calendar months inside `B` when those rows are created by this backfill.

#### Scenario: New positive allocation creates logs for missed past months

- **GIVEN** member M was created in calendar month 2026-02, has no `MonthlyAllocationLog` rows, and the server's current calendar month is 2026-05
- **WHEN** a MANAGER sets M's `monthlyAllocation` to 4000 without optional backfill range fields
- **THEN** the system creates `MonthlyAllocationLog` rows for months 2026-02, 2026-03, 2026-04, and 2026-05 each with `amount` 4000 (one row per month)
- **THEN** M's `balance` increases by 16000 relative to its value immediately before the update transaction

#### Scenario: Idempotent backfill when logs already exist

- **GIVEN** member M already has a `MonthlyAllocationLog` for 2026-03 and none for 2026-04
- **WHEN** a MANAGER sets M's `monthlyAllocation` to 4000 while the current calendar month is 2026-04
- **THEN** the system creates at most one new log for 2026-04 and does not create a second log for 2026-03
- **THEN** M's `balance` increases only by the sum of amounts for months that lacked a log before the operation

#### Scenario: Zero allocation skips backfill

- **GIVEN** member M has missing past months in `MonthlyAllocationLog`
- **WHEN** a MANAGER sets M's `monthlyAllocation` to 0
- **THEN** the system does not create new `MonthlyAllocationLog` rows as part of this update

#### Scenario: Optional backfill range limits which months receive logs

- **GIVEN** member M was created in calendar month 2026-02, has no `MonthlyAllocationLog` rows, and the server's current calendar month is 2026-05
- **WHEN** a MANAGER sets M's `monthlyAllocation` to 4000 with `backfillFromMonth` 2026-03 and `backfillToMonth` 2026-04
- **THEN** the system creates `MonthlyAllocationLog` rows only for 2026-03 and 2026-04 (one row per month) and does not create rows for 2026-02 or 2026-05 from this operation
- **THEN** M's `balance` increases by 8000 relative to its value immediately before the update transaction

#### Scenario: Reject request when only one backfill month bound is provided

- **GIVEN** a valid MANAGER session
- **WHEN** the allocation update request includes `backfillFromMonth` but not `backfillToMonth`, or the reverse
- **THEN** the system responds with HTTP 400
- **THEN** the member's stored `monthlyAllocation` is unchanged by that request

#### Scenario: Empty intersection still saves positive allocation

- **GIVEN** member M's creation month and the server's current calendar month imply range `C`, and the requested inclusive `[backfillFromMonth, backfillToMonth]` has empty intersection with `C`
- **WHEN** a MANAGER sets M's `monthlyAllocation` to a positive integer with both bounds present and valid `YYYY-MM` format
- **THEN** the system persists the new `monthlyAllocation`
- **THEN** the system creates no new `MonthlyAllocationLog` rows from this backfill step for that request

#### Scenario: Past months inside requested intersection increase lifetime log sum

- **GIVEN** member M was created in calendar month 2026-01, has no `MonthlyAllocationLog` rows for 2026-01 through 2026-04, the server's current calendar month is 2026-06, and M has no other logs
- **WHEN** a MANAGER sets M's `monthlyAllocation` to 5000 with `backfillFromMonth` 2026-02 and `backfillToMonth` 2026-04
- **THEN** the system creates `MonthlyAllocationLog` rows for 2026-02, 2026-03, and 2026-04 each with `amount` 5000
- **THEN** the sum of M's `MonthlyAllocationLog.amount` values after the operation equals the sum before the operation plus 15000


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
### Requirement: Persist each manager allocation update including effective backfill range

On every successful completion of the manager allocation update API for a member, the system SHALL append one immutable audit row capturing: the member id, the acting manager user id, the saved `monthlyAllocation` value after the request, the optional requested `backfillFromMonth` and `backfillToMonth` as submitted (`null` when omitted in JSON), the effective inclusive backfill month bounds used for that request's backfill evaluation expressed as the minimum and maximum `YYYY-MM` in set `B` (`null` for both when `B` was empty or when no backfill evaluation ran because `monthlyAllocation` was saved as 0), the integer count of new `MonthlyAllocationLog` rows created by that request's backfill, and a server-generated timestamp.

#### Scenario: Audit row after positive allocation with default range

- **WHEN** a MANAGER successfully sets a member's `monthlyAllocation` to a positive integer without optional backfill range fields and the backfill creates at least one new log
- **THEN** a new audit row exists with non-null effective bounds matching the inclusive creation-through-current range used for `B` and `backfilledMonthsCount` equal to the number of newly created logs for that request

#### Scenario: Audit row after zero allocation

- **WHEN** a MANAGER successfully sets a member's `monthlyAllocation` to 0
- **THEN** a new audit row exists with `monthlyAllocationAfter` equal to 0 and effective backfill bounds both `null` and `backfilledMonthsCount` equal to 0


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
### Requirement: Automatic monthly allocation on the first of each month

The system SHALL automatically add each member's monthly allocation amount to their balance on the first day of each calendar month. The system SHALL log each allocation in a MonthlyAllocationLog with the affected month in YYYY-MM format. The system SHALL guarantee idempotency: if the allocation endpoint is called multiple times for the same month, each member's balance SHALL be incremented at most once per month.

#### Scenario: Monthly allocation runs successfully

- **WHEN** the monthly allocation cron job runs on the first day of month 2025-06
- **THEN** each member with a non-zero monthly allocation receives that amount added to their balance
- **THEN** a MonthlyAllocationLog record is created for each member with month="2025-06"

#### Scenario: Duplicate cron run (idempotency)

- **WHEN** the monthly allocation endpoint is called a second time for month 2025-06
- **THEN** no member's balance is changed
- **THEN** no duplicate MonthlyAllocationLog records are created

##### Example: allocation amounts

- **GIVEN** member A has monthlyAllocation=3000 and balance=500; member B has monthlyAllocation=0 and balance=200
- **WHEN** the monthly allocation runs for 2025-06
- **THEN** member A's balance becomes 3500; member B's balance remains 200

---
### Requirement: Balance rollover across months

The system SHALL carry over any unspent balance from one month to the next. The system SHALL NOT reset a member's balance at month-end.

#### Scenario: Unspent balance carries over

- **WHEN** a member has a remaining balance of 800 at the end of a month
- **THEN** after the new month's allocation is added, the member's balance equals 800 plus their monthly allocation amount

---
### Requirement: Manager can manually trigger allocation for a missed month

The system SHALL allow a MANAGER to manually trigger the monthly allocation for a specific past month (YYYY-MM) that was not yet processed, to recover from missed cron runs.

#### Scenario: Manual trigger for a missed month

- **WHEN** a MANAGER triggers allocation for a past month that has no MonthlyAllocationLog entries
- **THEN** the system adds each member's allocation for that month and logs the allocation
- **THEN** the system confirms the number of members whose balance was updated

---
### Requirement: Manager views per-member allocation history

The system SHALL provide a `GET /api/admin/members/:id/allocation-history` endpoint accessible only to authenticated MANAGERs. The endpoint SHALL return the most recent 50 `MemberAllocationSettingLog` rows for the specified member, ordered by `createdAt` descending. Each row SHALL include: `id`, `monthlyAllocationAfter`, `requestedBackfillFromMonth`, `requestedBackfillToMonth`, `effectiveBackfillFromMonth`, `effectiveBackfillToMonth`, `backfilledMonthsCount`, `createdAt`, and the acting manager's `name`. The system SHALL return HTTP 404 if the member id does not correspond to a non-deleted user.

#### Scenario: Fetch allocation history for a member

- **WHEN** a MANAGER fetches `GET /api/admin/members/:id/allocation-history` for a valid non-deleted member
- **THEN** the system returns HTTP 200 with an array of at most 50 audit rows ordered by `createdAt` descending
- **THEN** each row includes `monthlyAllocationAfter`, request and effective backfill month bounds, `backfilledMonthsCount`, `createdAt`, and the acting manager's name

#### Scenario: Return empty array when no history exists

- **WHEN** a MANAGER fetches allocation history for a member who has never had their allocation set
- **THEN** the system returns HTTP 200 with an empty array

#### Scenario: Return 404 for unknown member

- **WHEN** a MANAGER fetches allocation history for a non-existent or soft-deleted member id
- **THEN** the system returns HTTP 404

<!-- @trace
source: member-management-enhancement
updated: 2026-05-04
-->