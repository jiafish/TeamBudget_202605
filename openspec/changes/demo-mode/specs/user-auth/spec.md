## ADDED Requirements

### Requirement: Homepage skips login in Demo Mode

The system SHALL redirect the homepage directly to `/admin/overview` when `DEMO_MODE=true` on the server, without rendering the login page.

#### Scenario: Homepage in Demo Mode skips login

- **WHEN** a visitor navigates to `/` and `DEMO_MODE=true`
- **THEN** the system SHALL redirect to `/admin/overview` and the login page SHALL NOT be displayed

### Requirement: Demo login endpoint provides sessionless JWT

The system SHALL expose `POST /api/auth/demo-login` which issues a valid session cookie with `role: "MANAGER"` without performing any database lookup or credential verification.

#### Scenario: Demo login endpoint available only in Demo Mode

- **WHEN** `POST /api/auth/demo-login` is requested and `DEMO_MODE` is not `"true"`
- **THEN** the system SHALL return HTTP 403 with no cookie set

#### Scenario: Demo login sets session cookie

- **WHEN** `POST /api/auth/demo-login` is requested and `DEMO_MODE=true`
- **THEN** the system SHALL respond HTTP 200 and set a `session` httpOnly cookie valid for 1 hour containing `{ userId: 0, role: "MANAGER" }`
