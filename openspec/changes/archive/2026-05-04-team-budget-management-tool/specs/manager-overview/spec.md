## ADDED Requirements

### Requirement: Manager views all members' expense records

The system SHALL provide a MANAGER with a paginated, month-filterable list of all expense records across all members. Each record in the list SHALL display: member name (登記人), amount, date, description, and a link to the receipt image if present. The default view SHALL show the current calendar month.

#### Scenario: View current month overview

- **WHEN** a MANAGER opens the overview page without specifying a month filter
- **THEN** the system displays all expense records for the current calendar month, ordered by date descending
- **THEN** each record shows the member's name, amount, date, and description

#### Scenario: Filter by a specific month

- **WHEN** a MANAGER selects month 2025-03 from the month picker
- **THEN** the system displays only records where the expense date falls within March 2025

### Requirement: Manager views per-member balance summary

The system SHALL provide a MANAGER with a summary of all members showing each member's current balance and their monthly allocation amount.

#### Scenario: Balance summary table

- **WHEN** a MANAGER views the overview page
- **THEN** a summary table lists every member with their name, monthly allocation, and current balance
- **THEN** members with a negative balance are visually distinguished (e.g., highlighted in red)

### Requirement: Manager views aggregate expense statistics

The system SHALL display aggregate statistics for the selected month: total amount spent across all members, and a per-member breakdown of total spending for that month.

#### Scenario: Monthly aggregate

- **WHEN** a MANAGER views the overview for month 2025-05
- **THEN** the system shows the sum of all expense amounts for that month
- **THEN** the system shows each member's individual total spending for that month

##### Example: aggregate calculation

- **GIVEN** member A spent 1200 in May; member B spent 800 in May; member C spent 0 in May
- **WHEN** MANAGER views the May overview
- **THEN** total displayed is 2000; member A shows 1200, member B shows 800, member C shows 0

### Requirement: Manager views receipt image

The system SHALL allow a MANAGER to view the receipt image linked to any expense record.

#### Scenario: View receipt

- **WHEN** a MANAGER clicks on a receipt link in the expense list
- **THEN** the system serves the receipt image through an authenticated API route
- **THEN** a MEMBER who is not the record owner receives a 403 response when attempting the same URL

### Requirement: Manager member administration page includes consistent navigation

The system SHALL render the same primary navigation header on the member administration page as on the admin overview page, including links to `/admin/overview`, `/admin/members`, and a logout control, so a MANAGER can return to the overview without using the browser back button.

#### Scenario: Navigate from member administration to overview

- **WHEN** a MANAGER opens the member administration page
- **THEN** the page displays a navigation control that navigates to the admin overview route
- **THEN** the navigation matches the overview page's admin navigation pattern (overview link, members link, logout)

### Requirement: Manager views team cumulative remaining balance

The system SHALL compute the team cumulative remaining balance as the arithmetic sum of `balance` across every `User` row (including users with role MANAGER and MEMBER). The admin overview SHALL display this value with labeling that distinguishes it from the selected month's total expense aggregate.

#### Scenario: Team sum matches database

- **GIVEN** user A has balance 100, user B has balance -50, and the MANAGER has balance 200
- **WHEN** a MANAGER views the admin overview
- **THEN** the displayed team cumulative remaining balance is 250

### Requirement: Member balance summary shows reimbursement-needed label

The system SHALL display the literal label text `需補發經費` on the per-member balance summary row when that member's `balance` is strictly less than zero, in addition to any existing negative-balance styling.

#### Scenario: Negative balance shows label

- **WHEN** a member row shows a balance of -1 or lower
- **THEN** the row includes the visible text `需補發經費`

#### Scenario: Non-negative balance hides label

- **WHEN** a member row shows a balance of 0 or greater
- **THEN** the row does not display the `需補發經費` label

### Requirement: Manager submits own expense from admin overview

The system SHALL provide MANAGER-only expense submission controls on the admin overview page (or a clearly linked admin subview reachable from overview without leaving the admin area) that submit through the same `POST /api/expenses` endpoint used by members, so the expense is recorded against the MANAGER's user account and decrements the MANAGER's balance.

#### Scenario: Manager posts own expense from overview

- **WHEN** a MANAGER submits a valid expense form from the admin overview flow
- **THEN** the system creates an `ExpenseRecord` with `userId` equal to the MANAGER's user id
- **THEN** the MANAGER's `balance` is decremented by the expense amount atomically
