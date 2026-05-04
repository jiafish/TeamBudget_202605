## MODIFIED Requirements

### Requirement: Login with number and password

The system SHALL authenticate users by verifying a login number and password combination. On successful authentication, the system SHALL issue a session token stored as an httpOnly, Secure, SameSite=Strict cookie with a 7-day expiry. The system SHALL additionally check whether the matching user account has a non-null `deletedAt` field; if so, the system SHALL return HTTP 401 with the error message "帳號已停用" and SHALL NOT set a session cookie, regardless of whether the credentials are correct.

#### Scenario: Successful login

- **WHEN** a user submits a valid login number and matching password for an account whose `deletedAt` is null
- **THEN** the system sets a session cookie and redirects to the user's home page based on their role

#### Scenario: Invalid credentials

- **WHEN** a user submits a login number that does not exist, or a password that does not match
- **THEN** the system returns an error message "登入號碼或密碼錯誤" without indicating which field is wrong
- **THEN** no session cookie is set

#### Scenario: Deleted account login blocked

- **WHEN** a user submits a valid login number and matching password for an account whose `deletedAt` is non-null
- **THEN** the system returns HTTP 401 with the error message "帳號已停用"
- **THEN** no session cookie is set

#### Scenario: Session expiry

- **WHEN** a user's session cookie has expired or is missing
- **THEN** any access to a protected page redirects the user to the login page

---

### Requirement: Manager views and manages member accounts

The system SHALL allow a MANAGER to view all non-deleted member accounts (i.e. accounts whose `deletedAt` is null), soft-delete a member account using an authenticated manager-only delete API, and reset passwords for any account including accounts whose `role` is `MANAGER` and the manager's own account. Password resets SHALL update the stored password hash for the target user. Account deletion SHALL set the target user's `deletedAt` field to the current server timestamp; all associated historical records SHALL be preserved. The system SHALL reject a delete request with HTTP 400 when the target user id equals the authenticated manager's user id. The system SHALL reject a delete request with HTTP 400 when the target is the only remaining non-deleted user with `MANAGER` role in the system.

#### Scenario: View member list excludes deleted accounts

- **WHEN** a MANAGER fetches the member list
- **THEN** only accounts whose `deletedAt` is null are returned

#### Scenario: Soft-delete a member

- **WHEN** a MANAGER sends a delete request for a valid member id that is not the manager's own id and is not the only remaining manager
- **THEN** the system sets `deletedAt` on that user and returns HTTP 200
- **THEN** the member no longer appears in the member list

#### Scenario: Reset password for any role

- **WHEN** a MANAGER submits a password reset request for any user id, including a MANAGER-role account or the manager's own account
- **THEN** the system updates the target account's password hash
- **THEN** the system returns HTTP 200
