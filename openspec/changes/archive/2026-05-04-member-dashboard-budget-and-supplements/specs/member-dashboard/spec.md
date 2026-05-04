## ADDED Requirements

### Requirement: Member views budget summary on dashboard

The system SHALL display on the MEMBER dashboard a budget summary containing: (1) the MEMBER's current monthly fixed allocation (`monthlyAllocation` as a non-negative integer); (2) total expense, the sum of all `ExpenseRecord.amount` for that MEMBER across all time; (3) a primary total labeled in the UI as **「分配經費＋補發加總」**, computed as the sum of all `MonthlyAllocationLog.amount` for that MEMBER plus the sum of `creditAmount` over all `ReimbursementDecision` rows where `targetUserId` equals that MEMBER's id and `reimbursed` is true; (4) **available balance**, computed as the primary total from (3) minus the total expense sum from (2). The authenticated member budget summary API SHALL return sufficient numeric fields for the client to render the breakdown (including at least the log sum and reimbursed supplement sum separately) and SHALL retrieve these values for the authenticated MEMBER only.

#### Scenario: Dashboard loads summary

- **WHEN** a MEMBER loads the dashboard
- **THEN** the budget summary displays monthly fixed allocation, total expense, the primary total consistent with server-side aggregation, and available balance consistent with server-side aggregation for that MEMBER

##### Example: Four months of equal allocation without supplements

- **GIVEN** MEMBER A has `monthlyAllocation` 4000 and `MonthlyAllocationLog` rows for months 2026-02, 2026-03, 2026-04, and 2026-05 each with `amount` 4000, zero reimbursed supplement credits, and the sum of all expense records for A equals 2000
- **WHEN** A views the budget summary in calendar month 2026-05
- **THEN** monthly fixed allocation displays 4000
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

## MODIFIED Requirements

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
