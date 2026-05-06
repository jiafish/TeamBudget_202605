# user-auth Specification

## Purpose

TBD - created by archiving change 'team-budget-management-tool'. Update Purpose after archive.

## Requirements

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


<!-- @trace
source: member-management-enhancement
updated: 2026-05-05
code:
  - src/lib/prisma.ts
  - src/app/api/admin/summary/route.ts
  - package.json
  - src/app/api/admin/categories/route.ts
  - src/app/api/admin/expenses/route.ts
  - README.md
  - prisma/migrations/migration_lock.toml
  - src/app/api/expenses/route.ts
  - src/app/components/ExpenseForm.tsx
  - src/app/api/admin/categories/[id]/route.ts
  - src/app/api/auth/demo-login/route.ts
  - src/app/dashboard/page.tsx
  - src/app/api/member/budget-summary/route.ts
  - src/lib/allocation.ts
  - src/app/admin/members/page.tsx
  - tsconfig.tsbuildinfo
  - prisma/migrations/20260503150439_init/migration.sql
  - scripts/gh-pages-build.cjs
  - src/app/static-home.tsx
  - src/app/api/member/reimbursements/route.ts
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260503161647_add_reimbursement_decision/migration.sql
  - src/app/api/admin/members/route.ts
  - src/app/api/auth/login/route.ts
  - src/app/page.tsx
  - next.config.ts
  - src/app/api/admin/reimbursements/route.ts
  - src/app/api/admin/members/[id]/allocation-history/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - .github/workflows/gh-pages.yml
  - prisma/schema.prisma
  - src/app/api/admin/members/[id]/route.ts
  - src/app/login/page.tsx
-->

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


<!-- @trace
source: member-management-enhancement
updated: 2026-05-05
code:
  - src/lib/prisma.ts
  - src/app/api/admin/summary/route.ts
  - package.json
  - src/app/api/admin/categories/route.ts
  - src/app/api/admin/expenses/route.ts
  - README.md
  - prisma/migrations/migration_lock.toml
  - src/app/api/expenses/route.ts
  - src/app/components/ExpenseForm.tsx
  - src/app/api/admin/categories/[id]/route.ts
  - src/app/api/auth/demo-login/route.ts
  - src/app/dashboard/page.tsx
  - src/app/api/member/budget-summary/route.ts
  - src/lib/allocation.ts
  - src/app/admin/members/page.tsx
  - tsconfig.tsbuildinfo
  - prisma/migrations/20260503150439_init/migration.sql
  - scripts/gh-pages-build.cjs
  - src/app/static-home.tsx
  - src/app/api/member/reimbursements/route.ts
  - src/app/admin/overview/page.tsx
  - prisma/migrations/20260503161647_add_reimbursement_decision/migration.sql
  - src/app/api/admin/members/route.ts
  - src/app/api/auth/login/route.ts
  - src/app/page.tsx
  - next.config.ts
  - src/app/api/admin/reimbursements/route.ts
  - src/app/api/admin/members/[id]/allocation-history/route.ts
  - src/app/api/admin/members/[id]/allocation/route.ts
  - .github/workflows/gh-pages.yml
  - prisma/schema.prisma
  - src/app/api/admin/members/[id]/route.ts
  - src/app/login/page.tsx
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

---
### Requirement: Demo mode identity switch login

The system SHALL display, when `DEMO_MODE=true`, two buttons on the login page — "管理員登入" and "成員登入" — instead of the username/password form. Clicking "管理員登入" SHALL POST `{ role: "MANAGER" }` to `/api/auth/demo-login` and redirect to `/dashboard` on success. Clicking "成員登入" SHALL POST `{ role: "MEMBER" }` to `/api/auth/demo-login` and redirect to the member dashboard on success. The `/api/auth/demo-login` endpoint SHALL accept a `role` field in the request body (`"MANAGER"` or `"MEMBER"`), issue a JWT with `{ userId: 0, role: "MANAGER" }` or `{ userId: 1, role: "MEMBER" }` respectively, set the session cookie (httpOnly, Secure in production, SameSite=Strict, 1-hour expiry), and return `{ ok: true, role }`. When `DEMO_MODE` is not `"true"`, the endpoint SHALL return HTTP 403.

#### Scenario: Demo login as MANAGER

- **WHEN** `DEMO_MODE=true` and the user clicks "管理員登入" on the login page
- **THEN** a session cookie is set with JWT payload `{ userId: 0, role: "MANAGER" }` and the user is redirected to `/dashboard`

#### Scenario: Demo login as MEMBER

- **WHEN** `DEMO_MODE=true` and the user clicks "成員登入" on the login page
- **THEN** a session cookie is set with JWT payload `{ userId: 1, role: "MEMBER" }` and the user is redirected to the member dashboard

#### Scenario: Normal login form shown when DEMO_MODE is not true

- **WHEN** `DEMO_MODE` is absent or not `"true"` and the user visits `/login`
- **THEN** the username/password form is displayed as normal

<!-- @trace
source: add-demo-mode
updated: 2026-05-06
code:
  - src/app/login/page.tsx
  - src/app/api/auth/demo-login/route.ts
-->

<!-- @trace
source: add-demo-mode
updated: 2026-05-06
code:
  - next-env.d.ts
  - src/lib/demo-data.ts
  - src/lib/prisma.ts
  - src/middleware.ts
  - src/app/api/auth/demo-login/route.ts
  - src/proxy.ts
  - src/app/api/expenses/route.ts
  - src/app/login/page.tsx
  - src/app/api/member/budget-summary/route.ts
  - src/app/api/member/reimbursements/route.ts
-->