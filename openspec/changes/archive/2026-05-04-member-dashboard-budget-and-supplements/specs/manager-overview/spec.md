## ADDED Requirements

### Requirement: Manager sets member monthly allocation from overview with optional backfill month range

The system SHALL provide on the admin overview page controls for a MANAGER to update each member's `monthlyAllocation` through the manager allocation update API (`PUT /api/admin/members/:id/allocation` or equivalent). The controls SHALL include two optional month fields for an inclusive backfill range, each representing a calendar month in `YYYY-MM` form. When both optional fields are empty, the client SHALL omit `backfillFromMonth` and `backfillToMonth` from the JSON body. When both are set, the client SHALL include both properties with the chosen values. The client SHALL NOT submit a request body that includes exactly one of `backfillFromMonth` or `backfillToMonth`.

#### Scenario: Save positive allocation without optional range

- **WHEN** a MANAGER enters a new positive `monthlyAllocation` and leaves both optional backfill month fields empty
- **THEN** the submitted request body contains no `backfillFromMonth` or `backfillToMonth` properties

#### Scenario: Save positive allocation with both optional range bounds

- **WHEN** a MANAGER sets the optional start month to 2026-03 and the optional end month to 2026-04 and saves a positive allocation
- **THEN** the submitted request body includes `backfillFromMonth` equal to 2026-03 and `backfillToMonth` equal to 2026-04

### Requirement: Manager views last allocation backfill range per member

The system SHALL expose, for each member in the MANAGER admin summary response used by the admin overview balance table, the latest allocation audit row for that member (or an equivalent embedded object), including at minimum: requested backfill start month or `null`, requested backfill end month or `null`, effective backfill start month or `null`, effective backfill end month or `null`, saved `monthlyAllocation` after that change, timestamp of the change, and the acting manager's display name. The admin overview SHALL render this information so a MANAGER can confirm each member's most recent allocation range and when it was applied.

#### Scenario: Summary includes last allocation audit for each member

- **GIVEN** member M's latest allocation audit row records requested bounds 2026-03..2026-04, effective bounds 2026-03..2026-04, `monthlyAllocationAfter` 4000, and a known `createdAt` timestamp
- **WHEN** a MANAGER loads the admin overview balance summary
- **THEN** the summary payload for member M includes requested start 2026-03, requested end 2026-04, effective start 2026-03, effective end 2026-04, saved allocation 4000, and the same timestamp string as stored on the audit row
