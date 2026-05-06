# demo-mode Specification

## Purpose

Provide a database-free demo mode controlled by an environment variable. When active, the system serves hardcoded fixture data and replaces the login form with a role-selection UI, enabling anyone to explore the full application without a database connection.

## Requirements

### Requirement: Demo mode activation via environment variable

The system SHALL enter demo mode when the environment variable `DEMO_MODE` is set to the string `"true"` on the server. When not set or set to any other value, the system SHALL operate in normal mode.

#### Scenario: Server starts with DEMO_MODE=true

- **WHEN** the Next.js server process has `DEMO_MODE=true` in its environment
- **THEN** all API routes that read data SHALL return fixture data from `src/lib/demo-data.ts` instead of querying the database

#### Scenario: Server starts without DEMO_MODE

- **WHEN** `DEMO_MODE` is absent or not `"true"`
- **THEN** all API routes SHALL query the database as normal


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

---
### Requirement: Demo mode identity switch login UI

When demo mode is active, the login page SHALL display two buttons labeled "管理員登入" and "成員登入" instead of the username/password form. Clicking either button SHALL immediately sign the user in as the corresponding role without requiring credentials.

#### Scenario: User clicks 管理員登入 in demo mode

- **WHEN** `DEMO_MODE=true` and the user visits `/login` and clicks "管理員登入"
- **THEN** the client SHALL POST `{ role: "MANAGER" }` to `/api/auth/demo-login`
- **THEN** the server SHALL set a `session` cookie containing a JWT with `{ userId: 0, role: "MANAGER" }` signed with `JWT_SECRET`, expiring in 1 hour
- **THEN** the client SHALL redirect to `/dashboard`

#### Scenario: User clicks 成員登入 in demo mode

- **WHEN** `DEMO_MODE=true` and the user visits `/login` and clicks "成員登入"
- **THEN** the client SHALL POST `{ role: "MEMBER" }` to `/api/auth/demo-login`
- **THEN** the server SHALL set a `session` cookie containing a JWT with `{ userId: 1, role: "MEMBER" }` signed with `JWT_SECRET`, expiring in 1 hour
- **THEN** the client SHALL redirect to the member dashboard

#### Scenario: Demo login endpoint called when DEMO_MODE is not true

- **WHEN** `DEMO_MODE` is not `"true"` and a POST is made to `/api/auth/demo-login`
- **THEN** the server SHALL return HTTP 403 with `{ error: "Not available" }`


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

---
### Requirement: Demo fixture data

The system SHALL provide a hardcoded fixture dataset exported from `src/lib/demo-data.ts` used by all API routes in demo mode. The fixture SHALL contain:

- 2 users: one with role `MANAGER` (id: 0, name: "管理員"), one with role `MEMBER` (id: 1, name: "測試成員")
- 3 expense records assigned to the MEMBER user, each with distinct category, amount (integers in NTD), date, and description
- 2 categories: "餐費" and "交通費"
- Monthly allocation of 3000 NTD for the MEMBER user
- Balance of 1500 NTD for the MEMBER user

#### Scenario: API returns fixture expenses in demo mode

- **WHEN** `DEMO_MODE=true` and an authenticated request is made to the expenses listing endpoint
- **THEN** the response SHALL contain exactly 3 expense records matching the fixture data

<!-- @trace
source: add-demo-mode
updated: 2026-05-06
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