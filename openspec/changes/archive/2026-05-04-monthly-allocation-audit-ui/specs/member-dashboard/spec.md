## MODIFIED Requirements

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
