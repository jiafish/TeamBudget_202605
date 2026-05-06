## ADDED Requirements

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
