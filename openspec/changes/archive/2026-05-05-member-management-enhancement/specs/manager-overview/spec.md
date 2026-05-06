## MODIFIED Requirements

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
