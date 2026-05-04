## ADDED Requirements

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

## MODIFIED Requirements

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
