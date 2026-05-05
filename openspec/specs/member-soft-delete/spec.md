# member-soft-delete Specification

## Purpose

Provides soft-delete semantics for user accounts, allowing a MANAGER to deactivate a member without destroying historical records. Deleted accounts are excluded from active member lists, monthly allocation jobs, and balance summaries, and are blocked from logging in.

## Requirements

### Requirement: Manager soft-deletes a member account

The system SHALL allow a MANAGER to soft-delete any user account by setting its `deletedAt` timestamp via `DELETE /api/admin/members/:id`. The `User` model SHALL have a nullable `deletedAt` field; a non-null value marks the account as deleted. The system SHALL reject a delete request with HTTP 400 when the target user id equals the authenticated manager's own user id. The system SHALL reject a delete request with HTTP 400 when the target user holds the `MANAGER` role and is the only remaining non-deleted user with that role in the system. On success the system SHALL return HTTP 200 and the `deletedAt` value SHALL be set to the server's current timestamp. All existing `ExpenseRecord`, `MonthlyAllocationLog`, `ReimbursementDecision`, and `MemberAllocationSettingLog` rows for the deleted user SHALL be preserved unchanged.

#### Scenario: Successful soft-delete of a member

- **WHEN** a MANAGER sends `DELETE /api/admin/members/:id` where the target is a MEMBER role account and the target id differs from the manager's own id
- **THEN** the system sets `User.deletedAt` to the current timestamp for that user
- **THEN** the system returns HTTP 200
- **THEN** all historical records for that user remain in the database

#### Scenario: Reject deleting self

- **WHEN** a MANAGER sends `DELETE /api/admin/members/:id` where `id` equals the authenticated manager's own user id
- **THEN** the system returns HTTP 400 with an error message indicating self-deletion is not allowed
- **THEN** the target user's `deletedAt` remains unchanged

#### Scenario: Reject deleting the last manager

- **WHEN** a MANAGER sends `DELETE /api/admin/members/:id` where the target has role `MANAGER` and is the only non-deleted MANAGER in the system
- **THEN** the system returns HTTP 400 with an error message indicating the last manager cannot be deleted
- **THEN** the target user's `deletedAt` remains unchanged

#### Scenario: Deleted member excluded from active member list

- **WHEN** a MANAGER fetches `GET /api/admin/members` after soft-deleting a member
- **THEN** the response does not include the soft-deleted member

#### Scenario: Deleted member excluded from monthly allocation cron

- **WHEN** the monthly allocation cron job runs
- **THEN** the system does not create `MonthlyAllocationLog` rows or modify the balance for any user whose `deletedAt` is non-null

#### Scenario: Deleted member excluded from summary

- **WHEN** a MANAGER fetches the admin summary
- **THEN** the response does not include users whose `deletedAt` is non-null in the members list or team totals

---

### Requirement: Soft-deleted account is blocked from login

The system SHALL reject login attempts from a user account whose `deletedAt` field is non-null. The system SHALL return HTTP 401 with the error message "帳號已停用" and SHALL NOT set a session cookie.

#### Scenario: Blocked login for deleted account

- **WHEN** a user submits a valid login number and password for an account whose `deletedAt` is non-null
- **THEN** the system returns HTTP 401 with error message "帳號已停用"
- **THEN** no session cookie is set

<!-- @trace
source: member-management-enhancement
updated: 2026-05-04
-->
