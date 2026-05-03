## ADDED Requirements

### Requirement: Manager records manual supplemental credit for a selected user

The system SHALL expose a MANAGER-only HTTP API that accepts a JSON body containing `targetUserId` as a positive integer user id, `creditAmount` as a positive integer, and an optional `note` string trimmed to at most 500 characters. The system SHALL reject the request with 400 when `creditAmount` is not a positive integer or when `targetUserId` does not identify an existing user. The system SHALL persist a new `ReimbursementDecision` row with `reimbursed=true`, `creditAmount` equal to the request amount, `targetUserId` and `managerUserId` set appropriately, and `note` stored when provided. The system SHALL atomically increment the target user's `balance` by `creditAmount` in the same database transaction as the decision row creation. The system SHALL NOT modify or delete existing `ExpenseRecord` rows as part of this operation. The system SHALL NOT require the target user's `balance` to be strictly less than zero.

#### Scenario: Manual credit for a member with non-negative balance

- **GIVEN** MEMBER M1 has `balance` 0 and `monthlyAllocation` 3000
- **WHEN** a MANAGER calls the manual supplemental API with `targetUserId` for M1 and `creditAmount` 500
- **THEN** a new persisted decision row exists with `reimbursed=true` and `creditAmount=500`
- **THEN** M1's `balance` becomes 500

#### Scenario: Manual credit for the acting manager user

- **GIVEN** the MANAGER user MGR exists
- **WHEN** a MANAGER calls the manual supplemental API with `targetUserId` equal to MGR's id and `creditAmount` 200
- **THEN** MGR's `balance` increases by 200 and a matching decision row is persisted

#### Scenario: Invalid amount is rejected

- **WHEN** a MANAGER calls the manual supplemental API with `creditAmount` 0 or a non-integer
- **THEN** the system responds with 400 and does not create a decision row or change balances

## MODIFIED Requirements

### Requirement: Manager views reimbursement decision history

The system SHALL provide a MANAGER-only API (or equivalent server-backed query) that returns persisted reimbursement decisions ordered by creation time descending, including at minimum: target member id or name, acting manager id or name, `reimbursed`, `creditAmount`, `createdAt`, and `note` when present. Rows created by the manual supplemental credit API SHALL appear in this same result list with the same fields as rows created by the member negative-balance reimbursement flow.

#### Scenario: List decisions newest first

- **GIVEN** two decisions exist for the same member at different times
- **WHEN** a MANAGER requests the reimbursement decision history
- **THEN** the newer decision appears before the older decision in the result list

#### Scenario: Manual supplemental decision appears in history

- **GIVEN** a manual supplemental credit decision was persisted for member M1
- **WHEN** a MANAGER requests the reimbursement decision history
- **THEN** the response includes that decision with `reimbursed=true` and a non-zero `creditAmount` for M1
