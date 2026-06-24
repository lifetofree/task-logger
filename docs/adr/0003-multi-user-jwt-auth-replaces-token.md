# ADR 0003: Multi-user JWT Authentication Replaces Single-User Token

## Status
Accepted (supersedes the single-user model in ADR 0001's *Auth* section)

## Context
Originally we chose single-user auth via a shared `X-Auth-Token` secret. The user then requested first-time signup with username + password, making the app multi-user. Every entry must now be isolated per user, and authentication must flow through signup/login flows rather than a shared secret.

Alternatives considered:
- **Keep single-user, allow changing token on first visit**: Smallest change but does not satisfy the requirement that *anyone* can create their own account.
- **Multi-user with session cookies + server-side sessions**: More "traditional" auth, harder to XSS-steal. Rejected in favor of JWT because Workers naturally supports stateless verification and the cookie model adds session storage in D1/KV.
- **OAuth / external IdP**: Out of scope for v1 (no profile editing, no password reset, no email verification).

## Decision
Adopt multi-user auth with the following shape:

- **Identity**: Username (3-32 chars, lowercase alphanumeric + underscore) + password (8+ chars). Passwords hashed with bcrypt (cost factor 12) via `bcryptjs`.
- **Sessions**: JWT signed with HS256 via `jose`. Lifetime: 7 days. Claims: `sub` (user id), `iat`, `exp`. Stateless verification on the server.
- **Transport**: `Authorization: Bearer <jwt>` header on every authenticated request. Token stored in `localStorage` under `task-logger:jwt`.
- **Open signup**: `/api/auth/signup` accepts any new username (unique). In-memory IP rate limit (5 signups/hour per IP) to deter casual abuse.
- **Row-level ownership**: `entries` gains a `user_id` column (NOT NULL, FK -> users.id). Every entry CRUD and every insights query filters by `user_id` extracted from the JWT.
- **JWT secret**: A new `JWT_SECRET` Cloudflare secret replaces the old `AUTH_TOKEN`. The old secret is deleted.

## Consequences
- Anyone with the URL can create an account. The URL itself becomes the gate. If the URL leaks, anyone can sign up and add noise.
- No password reset, no email verification, no profile editing in v1. Forgotten password = account loss.
- Every Worker query is now user-scoped. The cost of an unfiltered query is real: a bug would leak data across users.
- bcrypt at cost 12 adds ~250ms per signup/login. Acceptable for occasional auth.
- The existing test entry on the remote D1 is wiped on migration.
