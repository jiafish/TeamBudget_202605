## ADDED Requirements

### Requirement: Demo Mode activation via environment variable

The system SHALL support a Demo Mode controlled by the `DEMO_MODE=true` server-side environment variable and `NEXT_PUBLIC_DEMO_MODE=true` client-side environment variable. When both are set, the system SHALL bypass database-dependent flows and return static mock data.

#### Scenario: Demo Mode enabled on server

- **WHEN** `DEMO_MODE` environment variable is set to `"true"` on the server
- **THEN** all API routes SHALL enter their demo branch and return mock data without querying the database

#### Scenario: Demo Mode disabled

- **WHEN** `DEMO_MODE` is absent or not `"true"`
- **THEN** all API routes SHALL behave normally and query the database

### Requirement: Homepage redirects to admin overview in Demo Mode

The system SHALL redirect the homepage (`/`) directly to `/admin/overview` when `DEMO_MODE=true`, bypassing the login page entirely.

#### Scenario: Homepage accessed in Demo Mode

- **WHEN** a user navigates to `/` and `DEMO_MODE=true`
- **THEN** the system SHALL redirect to `/admin/overview` without rendering the login page

#### Scenario: Homepage accessed in normal mode

- **WHEN** a user navigates to `/` and `DEMO_MODE` is not `"true"`
- **THEN** the system SHALL redirect to `/login` as before

### Requirement: Demo login endpoint issues JWT without database access

The system SHALL provide a `/api/auth/demo-login` endpoint that signs and returns a JWT session cookie with `{ userId: 0, role: "MANAGER" }` without querying the database.

#### Scenario: Demo login succeeds in Demo Mode

- **WHEN** `POST /api/auth/demo-login` is called and `DEMO_MODE=true`
- **THEN** the system SHALL set a `session` httpOnly cookie containing a signed JWT with `userId: 0` and `role: "MANAGER"`, and return HTTP 200

#### Scenario: Demo login blocked outside Demo Mode

- **WHEN** `POST /api/auth/demo-login` is called and `DEMO_MODE` is not `"true"`
- **THEN** the system SHALL return HTTP 403

### Requirement: Admin data APIs return mock data in Demo Mode

The following API routes SHALL return hardcoded mock data when `DEMO_MODE=true`: `/api/admin/summary`, `/api/admin/expenses`, `/api/admin/members`, `/api/admin/reimbursements`, `/api/admin/categories`.

#### Scenario: Admin summary API in Demo Mode

- **WHEN** `GET /api/admin/summary` is called with a valid session and `DEMO_MODE=true`
- **THEN** the system SHALL return a static mock payload containing at least 2 member records with non-zero balance and expense fields, without querying the database

#### Scenario: Admin data API without valid session in Demo Mode

- **WHEN** any `/api/admin/*` data API is called without a valid session cookie and `DEMO_MODE=true`
- **THEN** the system SHALL still return HTTP 401 to trigger the client-side demo-login flow

### Requirement: Admin overview auto-triggers demo login on 401 in Demo Mode

When `NEXT_PUBLIC_DEMO_MODE=true`, the admin overview page SHALL automatically call `/api/auth/demo-login` upon receiving a 401 response from any data API, then reload the page instead of redirecting to `/login`.

#### Scenario: Admin overview auto-authenticates in Demo Mode

- **WHEN** the admin overview page receives HTTP 401 from a data API and `NEXT_PUBLIC_DEMO_MODE=true`
- **THEN** the page SHALL call `POST /api/auth/demo-login`, and upon success SHALL reload the current page

#### Scenario: Admin overview falls back to login on demo-login failure

- **WHEN** `/api/auth/demo-login` returns a non-200 response during the auto-authentication flow
- **THEN** the page SHALL redirect to `/login`
