## ADDED Requirements

### Requirement: Manager records reimbursement decision for negative member balance

The system SHALL allow a MANAGER to record a reimbursement decision for a target user whose role is MEMBER and whose `balance` is strictly less than zero at the time of the request. Each decision SHALL be persisted as its own row including: the target member user id, the acting MANAGER user id, whether reimbursement was approved (`reimbursed` boolean), `creditAmount` as a non-negative integer (zero when `reimbursed` is false), an optional note, and a creation timestamp. When `reimbursed` is true, `creditAmount` SHALL be a positive integer and the system SHALL atomically increment the target member's `balance` by `creditAmount` in the same database transaction as the persistence of the decision row. When `reimbursed` is false, the system SHALL NOT change the target member's `balance`. The system SHALL NOT modify or delete existing `ExpenseRecord` rows as part of this operation.

#### Scenario: Approve reimbursement with credit

- **GIVEN** MEMBER M1 has balance -400
- **WHEN** a MANAGER records a decision with `reimbursed=true` and `creditAmount=400` for M1
- **THEN** a new persisted decision row exists with `reimbursed=true` and `creditAmount=400`
- **THEN** M1's balance becomes 0

#### Scenario: Decline reimbursement without credit

- **GIVEN** MEMBER M1 has balance -200
- **WHEN** a MANAGER records a decision with `reimbursed=false` and `creditAmount=0` for M1
- **THEN** a new persisted decision row exists with `reimbursed=false`
- **THEN** M1's balance remains -200

#### Scenario: Non-member or non-negative balance is rejected

- **WHEN** a MANAGER attempts to record a reimbursement decision for a user that is not a MEMBER, or for a MEMBER whose balance is not strictly less than zero
- **THEN** the system rejects the request with 400 or 403 and does not change balances

### Requirement: Manager views reimbursement decision history

The system SHALL provide a MANAGER-only API (or equivalent server-backed query) that returns persisted reimbursement decisions ordered by creation time descending, including at minimum: target member id or name, acting manager id or name, `reimbursed`, `creditAmount`, and `createdAt`.

#### Scenario: List decisions newest first

- **GIVEN** two decisions exist for the same member at different times
- **WHEN** a MANAGER requests the reimbursement decision history
- **THEN** the newer decision appears before the older decision in the result list
