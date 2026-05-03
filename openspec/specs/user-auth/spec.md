# user-auth Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

### Requirement: Login with number and password

The system SHALL authenticate users by verifying a login number and password combination. On successful authentication, the system SHALL issue a session token stored as an httpOnly, Secure, SameSite=Strict cookie with a 7-day expiry.

#### Scenario: Successful login

- **WHEN** a user submits a valid login number and matching password
- **THEN** the system sets a session cookie and redirects to the user's home page based on their role

#### Scenario: Invalid credentials

- **WHEN** a user submits a login number that does not exist, or a password that does not match
- **THEN** the system returns an error message "登入號碼或密碼錯誤" without indicating which field is wrong
- **THEN** no session cookie is set

#### Scenario: Session expiry

- **WHEN** a user's session cookie has expired or is missing
- **THEN** any access to a protected page redirects the user to the login page

---
### Requirement: Role-based access control

The system SHALL assign each user exactly one role: MANAGER or MEMBER. The system SHALL enforce role-based access on all API routes and pages. MANAGER role users SHALL have access to all management capabilities. MEMBER role users SHALL have access only to their own data.

#### Scenario: Member accesses manager-only route

- **WHEN** a MEMBER user attempts to access a MANAGER-only page or API route
- **THEN** the system returns a 403 Forbidden response or redirects to the member home page

---
### Requirement: Manager creates member accounts

The system SHALL allow a MANAGER to create new user accounts by specifying a name, login number, and initial password. The login number SHALL be unique across all users. The system SHALL store the password as a bcrypt hash (cost factor 12).

#### Scenario: Successful account creation

- **WHEN** a MANAGER submits a new account form with a unique login number, name, and password
- **THEN** the system creates the user account with MEMBER role and zero balance
- **THEN** the new member appears in the member list

#### Scenario: Duplicate login number

- **WHEN** a MANAGER submits an account form with a login number already in use
- **THEN** the system rejects the request with an error "此登入號碼已被使用"
- **THEN** no new account is created

---
### Requirement: Manager views and manages member accounts

The system SHALL allow a MANAGER to view all member accounts and deactivate or reset passwords for existing members.

#### Scenario: Password reset by manager

- **WHEN** a MANAGER resets a member's password
- **THEN** the member's password hash is updated to the new value
- **THEN** any existing sessions for that member are invalidated

---
### Requirement: Change own password

The system SHALL allow any authenticated user to change their own password by providing their current password and a new password.

#### Scenario: Successful password change

- **WHEN** a user submits the correct current password and a new password
- **THEN** the system updates the password hash and invalidates all other active sessions for that user

#### Scenario: Wrong current password

- **WHEN** a user submits an incorrect current password
- **THEN** the system rejects the request with an error and does not change the password
