## MODIFIED Requirements

### Requirement: Manager sets monthly allocation per member

The system SHALL allow a MANAGER to set a monthly allocation amount (in whole currency units, minimum 0) for each member. The allocation amount represents the fixed amount added to a member's balance on the first day of each month. A member with a monthly allocation of 0 receives no automatic allocation.

#### Scenario: Set allocation for a member

- **WHEN** a MANAGER sets a member's monthly allocation to a positive integer
- **THEN** the system saves the new allocation amount
- **THEN** the system applies the missing-month backfill described in the requirement "Backfill missing allocation months when manager sets positive monthly allocation" using that saved positive integer as the credited amount for each newly created month row

#### Scenario: Set allocation to zero

- **WHEN** a MANAGER sets a member's monthly allocation to 0
- **THEN** the member receives no automatic allocation on future month-starts
- **THEN** the member's existing balance is not affected
- **THEN** the system does not create new `MonthlyAllocationLog` rows as part of the backfill policy for that update

### Requirement: Backfill missing allocation months when manager sets positive monthly allocation

When a MANAGER updates a member's `monthlyAllocation` to a positive integer via the manager allocation update API, the system SHALL, after validation passes and the new allocation value is persisted, compute the inclusive set of calendar months `B` for which the system SHALL evaluate missing `MonthlyAllocationLog` rows. Let `C` be the inclusive range from the member account's creation calendar month through the server's current calendar month (using the same month boundary rules as the existing scheduled allocation job).

- If the request body omits both `backfillFromMonth` and `backfillToMonth`, then `B` SHALL be exactly the set of months in `C`.
- If the request body includes both `backfillFromMonth` and `backfillToMonth`, each SHALL be a `YYYY-MM` string, SHALL satisfy `backfillFromMonth <= backfillToMonth`, and `B` SHALL be the intersection of `C` with the inclusive range from `backfillFromMonth` through `backfillToMonth`.

If exactly one of `backfillFromMonth` or `backfillToMonth` is present, or either value is not a valid `YYYY-MM`, or `backfillFromMonth > backfillToMonth`, the system SHALL respond with HTTP 400 and SHALL NOT change the member's stored `monthlyAllocation` for that request.

For every month in `B`, if no `MonthlyAllocationLog` row exists for that member and month, the system SHALL atomically create exactly one `MonthlyAllocationLog` with `amount` equal to the newly saved `monthlyAllocation` and increment that member's `balance` by the same amount. Months that already have a `MonthlyAllocationLog` SHALL be skipped. If `B` is empty, the system SHALL still persist the new positive `monthlyAllocation` when the request is otherwise valid, and SHALL create no new `MonthlyAllocationLog` rows for this backfill step.

The system SHALL guarantee idempotency for this backfill: repeating the same update request SHALL NOT create duplicate logs for the same month or double-increment `balance` for a month that already has a log.

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

## ADDED Requirements

### Requirement: Persist each manager allocation update including effective backfill range

On every successful completion of the manager allocation update API for a member, the system SHALL append one immutable audit row capturing: the member id, the acting manager user id, the saved `monthlyAllocation` value after the request, the optional requested `backfillFromMonth` and `backfillToMonth` as submitted (`null` when omitted in JSON), the effective inclusive backfill month bounds used for that request's backfill evaluation expressed as the minimum and maximum `YYYY-MM` in set `B` (`null` for both when `B` was empty or when no backfill evaluation ran because `monthlyAllocation` was saved as 0), the integer count of new `MonthlyAllocationLog` rows created by that request's backfill, and a server-generated timestamp.

#### Scenario: Audit row after positive allocation with default range

- **WHEN** a MANAGER successfully sets a member's `monthlyAllocation` to a positive integer without optional backfill range fields and the backfill creates at least one new log
- **THEN** a new audit row exists with non-null effective bounds matching the inclusive creation-through-current range used for `B` and `backfilledMonthsCount` equal to the number of newly created logs for that request

#### Scenario: Audit row after zero allocation

- **WHEN** a MANAGER successfully sets a member's `monthlyAllocation` to 0
- **THEN** a new audit row exists with `monthlyAllocationAfter` equal to 0 and effective backfill bounds both `null` and `backfilledMonthsCount` equal to 0
