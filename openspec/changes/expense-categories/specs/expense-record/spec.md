## MODIFIED Requirements

### Requirement: Member submits an expense record

The system SHALL allow any authenticated user (MANAGER or MEMBER) to submit an expense record against their own account. An expense record SHALL include: amount (positive integer, in whole currency units), date (user-specified, not required to be today), description (non-empty string), and optionally a receipt image file. The system SHALL also accept an optional categoryId; if provided, it SHALL reference an existing Category or be rejected with 400 Bad Request. If categoryId is omitted or null, the record is stored with categoryId=null. Upon submission, the system SHALL atomically deduct the amount from the user's balance.

#### Scenario: Successful expense submission without category

- **WHEN** a user submits a valid expense record with amount=500, date, description, and no categoryId
- **THEN** the system creates an ExpenseRecord with categoryId=null linked to the user
- **THEN** the user's balance is decremented by 500 atomically
- **THEN** the record appears in the user's monthly record list immediately

#### Scenario: Successful expense submission with category

- **WHEN** a user submits a valid expense record with amount=500, date, description, and a categoryId referencing an existing Category
- **THEN** the system creates an ExpenseRecord linked to the user and the category
- **THEN** the user's balance is decremented by 500 atomically
- **THEN** the record appears in the user's monthly record list with the category name included

#### Scenario: Expense exceeds balance

- **WHEN** a user submits an expense with an amount greater than their current balance
- **THEN** the system SHALL still accept and record the expense (negative balance is permitted)
- **THEN** the user's balance is decremented, resulting in a negative value if applicable

#### Scenario: Invalid amount

- **WHEN** a user submits an expense with amount=0 or a negative number
- **THEN** the system rejects the request with a validation error
- **THEN** no record is created and no balance change occurs

#### Scenario: Expense submitted with a non-existent categoryId

- **WHEN** a user submits an expense with a categoryId that does not match any existing Category
- **THEN** the system returns 400 Bad Request
- **THEN** no ExpenseRecord is created and no balance change occurs
