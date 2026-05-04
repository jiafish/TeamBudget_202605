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

The system SHALL allow a MANAGER to view all member accounts, **delete** a member account using an authenticated manager-only delete API, and **reset passwords** for any account including accounts whose `role` is `MANAGER`. Password resets SHALL update the stored password hash for the target user. Account deletion SHALL remove the user and dependent records according to the project's schema using either database cascade rules or explicit transactional deletes so that no constraint violations remain. The system SHALL reject a delete request with HTTP 400 when the target user id equals the authenticated manager's user id, and SHALL reject a delete request with HTTP 400 when the target is the only remaining user with `MANAGER` role in the system.

#### Scenario: Password reset by manager applies to manager role

- **GIVEN** user U has role `MANAGER` and a valid MANAGER session exists for acting manager A where A's user id is not equal to U's user id
- **WHEN** acting manager A submits a valid password reset for user U
- **THEN** user U's password hash is updated to the new value

#### Scenario: Delete member succeeds when another manager exists

- **GIVEN** member M is not the acting manager, the acting manager is a MANAGER, and at least one other `MANAGER` user exists besides M when M is a manager
- **WHEN** the acting manager confirms deletion of M via the delete API
- **THEN** member M's user row no longer exists and dependent rows are removed or updated per schema rules without leaving orphan rows that violate database constraints

#### Scenario: Reject delete last manager

- **GIVEN** user U is the only user in the system with `MANAGER` role
- **WHEN** a MANAGER invokes the delete API targeting U
- **THEN** the API responds with HTTP 400 and user U remains

#### Scenario: Reject delete self

- **GIVEN** the authenticated MANAGER's user id equals the delete target user id
- **WHEN** the delete API is invoked
- **THEN** the API responds with HTTP 400 and no deletion occurs


<!-- @trace
source: monthly-allocation-audit-ui
updated: 2026-05-04
code:
  - src/lib/allocation.ts
  - prisma/migrations/20260504120000_add_member_allocation_setting_log/migration.sql
  - src/app/dashboard/page.tsx
  - src/app/admin/overview/page.tsx
  - src/app/api/admin/summary/route.ts
  - src/app/api/member/budget-summary/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - prisma/schema.prisma
  - tsconfig.tsbuildinfo
  - src/app/api/member/reimbursements/route.ts
-->

---
### Requirement: Change own password

The system SHALL allow any authenticated user to change their own password by providing their current password and a new password.

#### Scenario: Successful password change

- **WHEN** a user submits the correct current password and a new password
- **THEN** the system updates the password hash and invalidates all other active sessions for that user

#### Scenario: Wrong current password

- **WHEN** a user submits an incorrect current password
- **THEN** the system rejects the request with an error and does not change the password