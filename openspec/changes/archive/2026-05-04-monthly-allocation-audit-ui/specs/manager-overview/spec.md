## REMOVED Requirements

### Requirement: Manager views last allocation backfill range per member

**Reason**: Replaced by per-member allocation audit history; the primary balance table no longer shows a single inline last-range column.

**Migration**: Implement the ADDED requirement "Manager views allocation setting audit history from admin overview" and remove UI that only surfaced the latest pair in the main grid.

#### Scenario: Deprecated requirement superseded at release

- **WHEN** a release ships that implements "Manager views allocation setting audit history from admin overview"
- **THEN** implementations SHALL NOT rely on this removed requirement for acceptance; audit history and updated balance summary requirements govern behavior instead

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Manager views per-member balance summary

The system SHALL provide a MANAGER with a summary of every user account showing each user's name, the member's current `monthlyAllocation` with UI labeling that identifies it as the **monthly stipend** (fixed amount per allocation month, not the lifetime credited sum), and a **displayed remaining amount** computed as the sum of that user's `MonthlyAllocationLog.amount` values plus the sum of `creditAmount` for `ReimbursementDecision` rows where `targetUserId` equals that user's id and `reimbursed` is true, minus the sum of `ExpenseRecord.amount` across all expense rows whose `userId` equals that user's id (lifetime total expenses for that user). The summary SHALL also surface the lifetime sum of `MonthlyAllocationLog.amount` for that member in the same view region (dedicated column, summary line inside the audit panel header, or adjacent helper text) so a MANAGER can compare stipend to credited history. The summary SHALL NOT use `User.balance` as the source of truth for the displayed remaining amount column.

#### Scenario: Balance summary table uses formula

- **WHEN** a MANAGER views the overview page
- **THEN** a summary table lists every user with their name, monthly stipend, and displayed remaining amount equal to the user's summed allocation logs plus summed reimbursed supplement credits minus the user's lifetime summed expenses
- **THEN** rows whose displayed remaining amount is strictly less than zero are visually distinguished (for example highlighted in red)

##### Example: displayed remaining per member

- **GIVEN** user U1 has `MonthlyAllocationLog` amounts summing to 5000, reimbursed supplement credits summing to 0, and expense sums 3200; user U2 has allocation log amounts summing to 2000, reimbursed supplement credits summing to 0, and expense sums 4000
- **WHEN** a MANAGER views the balance summary
- **THEN** U1's displayed remaining amount is 1800 and U2's displayed remaining amount is -2000

#### Scenario: Stipend is shown distinctly from lifetime log sum

- **GIVEN** member M has `monthlyAllocation` 4000 and `MonthlyAllocationLog` rows whose amounts sum to 12000
- **WHEN** a MANAGER views the balance summary for member M
- **THEN** the UI presents 4000 as the monthly stipend and presents 12000 as the lifetime credited sum from logs without implying they are the same value

## MODIFIED Requirements

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
