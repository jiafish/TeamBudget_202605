## ADDED Requirements

### Requirement: Admin manages expense categories

The system SHALL allow any MANAGER to create and delete expense categories. A category SHALL have a unique name (case-sensitive). The system SHALL reject creation of a duplicate name with a 409 Conflict response. The system SHALL list all categories via GET /api/admin/categories, accessible to both MANAGER and MEMBER roles (to populate the expense form dropdown). Unauthenticated requests SHALL receive 401.

#### Scenario: Admin creates a new category

- **WHEN** a MANAGER sends POST /api/admin/categories with name="差旅"
- **THEN** the system creates a Category record with the given name
- **THEN** the response returns the new category with its id and name

#### Scenario: Duplicate category name rejected

- **WHEN** a MANAGER sends POST /api/admin/categories with a name that already exists
- **THEN** the system returns 409 Conflict
- **THEN** no new Category record is created

#### Scenario: Admin deletes a category with no linked expenses

- **WHEN** a MANAGER sends DELETE /api/admin/categories/[id] for a category with zero ExpenseRecords referencing it
- **THEN** the system deletes the category and returns 200 OK

#### Scenario: Admin deletes a category that has linked expenses

- **WHEN** a MANAGER sends DELETE /api/admin/categories/[id] for a category referenced by one or more ExpenseRecords
- **THEN** the system returns 409 Conflict
- **THEN** the category is not deleted

#### Scenario: Non-manager attempts to create or delete a category

- **WHEN** a MEMBER sends POST or DELETE to /api/admin/categories or /api/admin/categories/[id]
- **THEN** the system returns 403 Forbidden

---

### Requirement: Member may optionally select a category when submitting an expense

The system SHALL allow a categoryId to be included when submitting an expense record. The categoryId field is optional — omitting it or sending null SHALL be accepted, resulting in an ExpenseRecord with categoryId=null. If a categoryId is provided, the system SHALL validate that it references an existing Category, and reject with 400 Bad Request if not found. The category selection SHALL be presented as a dropdown in the expense form, with an option representing no selection.

#### Scenario: Expense submitted with a valid category

- **WHEN** a user submits an expense with a categoryId referencing an existing Category
- **THEN** the system creates the ExpenseRecord with that categoryId
- **THEN** the expense record is retrievable with its category name included

#### Scenario: Expense submitted without a category

- **WHEN** a user submits an expense with no categoryId field (or categoryId=null)
- **THEN** the system creates the ExpenseRecord with categoryId=null
- **THEN** no error is returned

#### Scenario: Expense submitted with a non-existent categoryId

- **WHEN** a user submits an expense with a categoryId that does not match any existing Category
- **THEN** the system returns 400 Bad Request
- **THEN** no ExpenseRecord is created

---

### Requirement: Admin can filter expenses by category including unlabeled

The system SHALL allow MANAGER to filter expense records by category via an optional query parameter on GET /api/admin/expenses. The parameter SHALL support three modes: omitted (return all), an integer id (return records matching that categoryId), or the string "null" (return records where categoryId IS NULL). Expense records in admin responses SHALL include the category name alongside categoryId, or null if uncategorized.

#### Scenario: Filter expenses by specific category

- **WHEN** a MANAGER sends GET /api/admin/expenses?categoryId=2
- **THEN** the system returns only ExpenseRecords where categoryId=2

#### Scenario: Filter expenses to show only unlabeled records

- **WHEN** a MANAGER sends GET /api/admin/expenses?categoryId=null
- **THEN** the system returns only ExpenseRecords where categoryId IS NULL

#### Scenario: No filter returns all expenses

- **WHEN** a MANAGER sends GET /api/admin/expenses with no categoryId param
- **THEN** the system returns all ExpenseRecords regardless of category

##### Example: filter modes

| categoryId param | SQL condition              | Expected result                        |
|------------------|----------------------------|----------------------------------------|
| (omitted)        | (none)                     | All records                            |
| 2                | categoryId = 2             | Records tagged with category id=2 only |
| "null"           | categoryId IS NULL         | Records with no category tag           |
| 9999             | categoryId = 9999          | Empty array (no match)                 |
