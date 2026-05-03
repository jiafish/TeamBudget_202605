# budget-allocation Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Manager sets monthly allocation per member

The system SHALL allow a MANAGER to set a monthly allocation amount (in whole currency units, minimum 0) for each member. The allocation amount represents the fixed amount added to a member's balance on the first day of each month. A member with a monthly allocation of 0 receives no automatic allocation.

#### Scenario: Set allocation for a member

- **WHEN** a MANAGER sets a member's monthly allocation to a positive integer
- **THEN** the system saves the new allocation amount
- **THEN** the change takes effect from the next monthly allocation cycle

#### Scenario: Set allocation to zero

- **WHEN** a MANAGER sets a member's monthly allocation to 0
- **THEN** the member receives no automatic allocation on future month-starts
- **THEN** the member's existing balance is not affected

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
