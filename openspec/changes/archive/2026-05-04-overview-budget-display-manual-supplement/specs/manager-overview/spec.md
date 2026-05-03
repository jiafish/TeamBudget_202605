## MODIFIED Requirements

### Requirement: Manager views per-member balance summary

The system SHALL provide a MANAGER with a summary of every user account showing each user's name, `monthlyAllocation`, and a **displayed remaining amount** computed as that user's `monthlyAllocation` minus the sum of `ExpenseRecord.amount` across all expense rows whose `userId` equals that user's id (lifetime total expenses for that user). The summary SHALL NOT use `User.balance` as the source of truth for the displayed remaining amount column.

#### Scenario: Balance summary table uses formula

- **WHEN** a MANAGER views the overview page
- **THEN** a summary table lists every user with their name, monthly allocation, and displayed remaining amount equal to `monthlyAllocation` minus the user's lifetime summed expenses
- **THEN** rows whose displayed remaining amount is strictly less than zero are visually distinguished (e.g., highlighted in red)

##### Example: displayed remaining per member

- **GIVEN** user U1 has `monthlyAllocation` 5000 and expense sums 3200; user U2 has `monthlyAllocation` 3000 and expense sums 4000
- **WHEN** a MANAGER views the balance summary
- **THEN** U1's displayed remaining amount is 1800 and U2's displayed remaining amount is -1000

---
### Requirement: Manager views team cumulative remaining balance

The system SHALL compute the **team displayed cumulative remaining balance** as the sum of every user's `monthlyAllocation` minus the sum of every `ExpenseRecord.amount` in the system (all members and the MANAGER). The admin overview SHALL display this value in the primary dashboard hero area alongside the **team total historical spend**, defined as the sum of all `ExpenseRecord.amount` values in the system, with labeling that distinguishes the team displayed cumulative remaining balance from the team total historical spend.

#### Scenario: Team displayed sum matches formula

- **GIVEN** user A has `monthlyAllocation` 5000 and lifetime expenses 1000; user B has `monthlyAllocation` 4000 and lifetime expenses 4500; the MANAGER has `monthlyAllocation` 2000 and lifetime expenses 500
- **WHEN** a MANAGER views the admin overview
- **THEN** the displayed team displayed cumulative remaining balance is 9000 minus 6000, i.e., 3000

---
### Requirement: Member balance summary shows reimbursement-needed label

The system SHALL display the literal label text `需補發經費` on the per-user balance summary row when that row's **displayed remaining amount** (computed as `monthlyAllocation` minus lifetime summed expenses for that user) is strictly less than zero, in addition to any existing negative styling for that row.

#### Scenario: Negative displayed remaining shows label

- **WHEN** a member row's displayed remaining amount is -1 or lower
- **THEN** the row includes the visible text `需補發經費`

#### Scenario: Non-negative displayed remaining hides label

- **WHEN** a member row's displayed remaining amount is 0 or greater
- **THEN** the row does not display the `需補發經費` label

---
### Requirement: Manager submits own expense from admin overview

The system SHALL provide MANAGER-only expense submission controls on the admin overview page that submit through the same `POST /api/expenses` endpoint used by members, so the expense is recorded against the MANAGER's user account and decrements the MANAGER's balance. These controls SHALL be placed inside the **登錄支出** tab located below the balance summary (tabbed region), not in the primary dashboard hero metrics section.

#### Scenario: Manager posts own expense from overview

- **WHEN** a MANAGER selects the **登錄支出** tab and submits a valid expense form
- **THEN** the system creates an `ExpenseRecord` with `userId` equal to the MANAGER's user id
- **THEN** the MANAGER's `balance` is decremented by the expense amount atomically

## ADDED Requirements

### Requirement: Manager overview dashboard hero shows team total historical spend and team displayed balance

The system SHALL render, as the first primary content section on the admin overview page, both of the following values: (1) the **team total historical spend**, defined as the sum of all `ExpenseRecord.amount` values system-wide (the same aggregate as `totals.sumTotalExpense` from the MANAGER summary API), and (2) the **team displayed cumulative remaining balance** as defined in the modified team cumulative requirement. The hero section SHALL NOT include a month picker for these two metrics. The section SHALL label each value so a MANAGER can distinguish lifetime total spend from the lifetime allocation-minus-expense balance.

#### Scenario: Hero shows lifetime totals only

- **WHEN** a MANAGER views the admin overview hero metrics
- **THEN** the displayed team total historical spend equals the sum of every expense record amount in the database
- **THEN** the displayed team displayed cumulative remaining balance equals the sum of all users' `monthlyAllocation` minus that summed expense total

---
### Requirement: Manager overview primary tabs below balance summary

The system SHALL render, directly below the per-member balance summary table, a tab control with exactly three tabs labeled for MANAGER consumption as **月份支出統計**, **核銷補發**, and **登錄支出**. Exactly one tab panel SHALL be visible at a time based on the active tab selection.

#### Scenario: Three tabs exist

- **WHEN** a MANAGER views the admin overview below the balance summary
- **THEN** three selectable tabs are visible with the specified labels

---
### Requirement: Month statistics tab content

When the **月份支出統計** tab is active, the system SHALL display a month selector, the total expense amount for the selected calendar month across all users, a per-member spending breakdown for that month, and the full list of expense records for that month (date, member, amount, description, receipt access), using the same month parameter that drives `GET /api/admin/expenses?month=`.

#### Scenario: Changing month updates tab content

- **WHEN** a MANAGER selects month 2025-04 within the **月份支出統計** tab
- **THEN** the displayed monthly total and record list include only expenses whose dates fall in April 2025

---
### Requirement: Reimbursement tab content

When the **核銷補發** tab is active, the system SHALL display the manual supplemental credit form and the reimbursement decision history table in the same view (stacked vertically or an equivalent layout that keeps both discoverable without leaving the tab).

#### Scenario: Manual form and history in reimbursement tab

- **WHEN** a MANAGER selects the **核銷補發** tab
- **THEN** both the manual supplemental credit form and the reimbursement history table are visible within that tab

---
### Requirement: Manual supplemental credit form on admin overview

The system SHALL provide MANAGER-only controls on the admin overview page to submit a manual supplemental credit consisting of a target user selector, a positive integer credit amount, and an optional note. Submission SHALL call a dedicated MANAGER-only API that persists the credit as a reimbursement decision row and increments the target user's `balance`, then refreshes overview data so the decision appears in the reimbursement history list.

#### Scenario: Successful manual supplemental submission

- **WHEN** a MANAGER selects an existing member, enters credit amount 1500, optionally enters a note, and submits the manual supplemental form
- **THEN** the system returns success and a new reimbursement decision row exists with `reimbursed=true` and `creditAmount=1500` for that target
- **THEN** the target user's `balance` increases by 1500

---
### Requirement: Reimbursement-needed control activates reimbursement tab and manual supplemental form

The system SHALL treat the `需補發經費` label as an interactive control. When a MANAGER activates the control on a member row, the system SHALL first activate the **核銷補發** tab, then SHALL scroll the manual supplemental credit form into view, and SHALL pre-select that member as the target user in the form.

#### Scenario: Click label switches tab scrolls and preselects

- **WHEN** a MANAGER clicks the `需補發經費` label on member row R
- **THEN** the **核銷補發** tab becomes the active tab if it was not already
- **THEN** the manual supplemental credit form becomes visible in the viewport without requiring a full page navigation
- **THEN** the target user selector is set to member R
