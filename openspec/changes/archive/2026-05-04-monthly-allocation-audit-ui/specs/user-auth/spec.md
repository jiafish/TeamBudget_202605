## MODIFIED Requirements

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
