## ADDED Requirements

### Requirement: Member views own expense records by month

The system SHALL allow a MEMBER to view their own expense records filtered by calendar month. The default view SHALL show the current calendar month. Each record SHALL display: date, amount, description, and a receipt icon/link if a receipt is attached.

#### Scenario: View current month records

- **WHEN** a MEMBER opens their dashboard without specifying a month
- **THEN** the system displays all of that member's expense records for the current calendar month, ordered by date descending

#### Scenario: Navigate to a previous month

- **WHEN** a MEMBER selects a previous month from the month picker
- **THEN** the system displays only that member's expense records for the selected month

### Requirement: Member views own remaining balance

The system SHALL display a MEMBER's current balance prominently on their dashboard. The balance SHALL reflect all submitted expense records and all received monthly allocations.

#### Scenario: Balance display

- **WHEN** a MEMBER loads their dashboard
- **THEN** the current balance is displayed at the top of the page
- **THEN** the balance updates immediately after a new expense is submitted without requiring a page reload

#### Scenario: Negative balance display

- **WHEN** a MEMBER's balance is negative
- **THEN** the balance is displayed in red with a negative sign

### Requirement: Member cannot access other members' data

The system SHALL prevent a MEMBER from reading any data (expense records, balance, allocation) belonging to another user.

#### Scenario: Unauthorized data access attempt

- **WHEN** a MEMBER requests expense records or balance information for a different user ID via any API route
- **THEN** the system returns a 403 Forbidden response
- **THEN** no data from the other user is included in any response

### Requirement: Member views own receipt

The system SHALL allow a MEMBER to view the receipt image for their own expense records.

#### Scenario: View own receipt

- **WHEN** a MEMBER clicks on a receipt link for one of their own expense records
- **THEN** the system serves the receipt image via an authenticated API route

#### Scenario: Access another member's receipt

- **WHEN** a MEMBER attempts to access a receipt URL belonging to a different user's record
- **THEN** the system returns a 403 Forbidden response
