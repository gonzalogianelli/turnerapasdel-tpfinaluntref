---
name: padel-backend-qa
description: Execute detailed end-to-end QA and verification across a Node.js ESM, Express, Sequelize/MySQL padel club backend API. Use when asked to run detailed testing, full QA checklists, regression checks, concurrency tests, RBAC/HTTPOnly cookie checks, open match/quorum tests, email notification failure/disabled checks, or OpenAPI/log verification.
---

# padel-backend-qa

Run thorough, repeatable verification across every layer and domain module of a Node.js ESM padel complex backend without leaving residual test artifacts or leaking secrets.

## When to Use

Use this skill when you need to:

* Verify syntax, server startup, health endpoints, and OpenAPI JSON generation across all modules.
* Test JWT HTTPOnly cookie authentication, role-based access control (`jugador` vs `administrador`), and error handling (`400`, `401`, `403`, `404`, `409`).
* Validate courts, 90-minute time slots, reservation states, slot availability, and historical vs active slot counts.
* Test incomplete matches, category compatibility (same category or up to one tier above), pessimistic locking on the final spot, self vs admin removals, and quorum cancellation without automatic slot republication.
* Verify decoupled email notifications with SMTP disabled or failing transport without breaking business flows or exposing secrets in logs.

## Steps

1. **Preflight and Syntax Check**
   Inspect `package.json`, `src/`, and `openspec/` to confirm available scripts and ESM `.js` imports. Run `node --check` across source files before starting the server so syntax issues are caught early.

2. **Startup, Health, and OpenAPI Check**
   Start the server on a dedicated local test port with SMTP disabled (`SMTP_HOST` and `SMTP_FROM` empty) so startup resilience is proven. Verify `/api/health` and `/api-docs.json` respond cleanly and confirm no unexpected errors appear in structured logs.

3. **Auth, RBAC, and Error Contract Verification**
   Authenticate separate `administrador` and `jugador` sessions using cookie jars. Verify unauthenticated requests return `401`, forbidden role actions return `403`, invalid inputs return `400`, missing resources return `404`, and state/uniqueness conflicts return `409` with consistent error JSON and zero password hashes or tokens in responses.

4. **Courts, 90-Minute Slots, and Reservations**
   Create a court and 90-minute slots, verify slot listing and filtering, and exercise reservation creation, confirmation, rejection, cancellation, and republication rules. Confirm slot states (`disponible`, `reservado`, `cancelado`) match domain rules after each transition.

5. **Incomplete Matches, Category Rules, Concurrency, and Quorum**
   Create a match tied to a confirmed reservation with a `reservado` slot. Test listing open matches (`incompleto`), detail visibility (`404` on foreign/hidden matches), category compatibility (same or one tier above allowed; wider gap rejected with `409`), duplicate registration rejection (`409`), and concurrent requests for the final spot (one `201`, one `409`, final count capped at 4). Test player self-removal and admin removal without automatic slot republication, plus quorum cancellation marking match, reservation, and slot as `cancelado` while removing registrations.

6. **Email Notification Resilience and Secret Hygiene**
   Test notifications both with SMTP disabled and with a simulated failing mail transport across registration, reservation lifecycle events, and match inscription, removal, and quorum cancellation. Confirm HTTP status codes and database state transitions remain unchanged, warnings are logged cleanly, and no passwords, SMTP credentials, or tokens appear in logs or payloads.

7. **Cleanup and Final Report**
   Stop any test server process, remove temporary cookie jars or test scripts, verify `git status` is clean of stray artifacts, and report pass/fail results per module along with any remaining risks or cleanup steps.

## Gotchas

* **Async fire-and-forget notifications:** When email dispatch runs after transaction commit without awaiting in the HTTP path, allow a brief pause in scripts before asserting on mock deliveries or log lines, and ensure rejections are always caught so unhandled promise rejections never occur.
* **Cookie jar and port collisions:** Always use isolated temporary cookie files and an explicit test port, then clean them up on exit so stale cookies or background Node processes do not pollute later runs.
* **Test data cleanup:** Synthetic users, courts, slots, reservations, and matches created during live runs remain in the database unless cleaned up; remove test records or note exact test IDs in the summary.
* **No secret leakage in logs or docs:** Never echo real credentials, `.env` secrets, or raw tokens in test output or documentation updates.