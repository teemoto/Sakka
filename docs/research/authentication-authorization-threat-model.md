# Authentication and authorization threat model

**Date:** 2026-08-22  
**Status:** Phase 1 research; informs, but does not replace, the credential-model ADR

## Purpose

Define the assets, actors, trust boundaries, threats, and minimum security controls for Sakka's first dogfood workflow.

The first slice is intentionally narrow: the authenticated owner of `teemoto/aslambhai` edits configured Markdown content, saves to a Sakka working branch, and creates a draft pull request. GitHub remains the authoritative store and review surface.

## Evidence incorporated

Three experiments established different parts of the model:

- A fine-grained PAT can perform the Git workflow, but is a user-managed credential suitable only for local comparison.
- A GitHub App installation token can perform the workflow with a selected repository scope and short lifetime, but produces bot attribution.
- A GitHub App user token is limited by the intersection of App permissions, installation scope, and the signed-in user's access. It performed the workflow and produced human Git attribution.

The experiments do not choose the production runtime, session system, or final token-storage strategy.

## Protected assets

| Asset | Why it matters |
| --- | --- |
| GitHub App private key and client secret | Can mint installation tokens or exchange authorization codes. |
| GitHub App user access and refresh tokens | Can act as an author within the App/user permission intersection. |
| Sakka browser session | Represents an authenticated human and authorizes user actions. |
| Repository configuration | Must bind Sakka to the intended owner, repository, base branch, and content directory. |
| Content source, version SHA, and working branch | Determines what Sakka reads and what it may change. |
| Pull-request and commit attribution | Must accurately identify the originating author in future collaboration. |
| Audit/operation records | Needed to investigate writes without retaining secrets or unnecessary content. |

## Actors and trust boundaries

```text
Untrusted browser                 Trusted Sakka server                 GitHub
─────────────────                ────────────────────                 ──────
author session ── HTTPS ───────► session + authorization ── OAuth ──► identity
editor input  ── HTTPS ───────► path/version validation  ── API ───► repository
                                 token/secret storage                 App install
                                 write/PR audit record                 Git history
```

The browser is untrusted for repository identity, paths, branch names, version identifiers, authorization decisions, and credentials. It may request an operation, but the server must independently validate that request against configuration, the session identity, and GitHub's current authorization data.

## MVP authorization statement

For the first dogfood slice, only the authenticated repository owner may operate on the one configured repository.

Before any mutation, the server must verify all of the following:

1. The Sakka session identifies the expected GitHub user.
2. The configured repository is exactly `teemoto/aslambhai`.
3. The authenticated user can access the expected GitHub App installation and that installation exposes the configured repository.
4. The requested path is inside the configured content directory and has an allowed extension.
5. The requested base branch and source version match the server's validated configuration and current GitHub state.

This is a product rule for the MVP, not a general multi-repository authorization system.

## Threats and required controls

| Threat | Example | Minimum control before dogfooding |
| --- | --- | --- |
| OAuth callback forgery or code interception | An attacker causes Sakka to accept a callback they initiated. | Exact registered redirect URI; high-entropy, single-use `state` tied to the initiating session; PKCE; reject missing, expired, or mismatched state. |
| Open redirect | A callback or post-login target sends a user or code to an attacker-controlled URL. | Do not accept arbitrary return URLs; use an allowlist of internal relative paths. Disable callback wildcard matching unless a concrete, controlled need exists. |
| Session theft or fixation | A stolen or pre-set session lets another person publish. | HTTPS; `Secure`, `HttpOnly`, and appropriate `SameSite` cookies; rotate session ID after login; short idle/absolute session limits; logout and revocation handling. |
| Cross-site request forgery | A hostile page triggers a save or publish using a valid Sakka session. | Server-side origin checks and CSRF protection on every state-changing browser request. |
| Token or secret leakage | A private key, client secret, token, callback code, or authorization header reaches the browser, logs, source control, or an error page. | Keep credentials server-side; use managed secret storage in production; redact logs; never return tokens to the browser; use environment validation that reports names, never values. |
| Confused-deputy repository write | A browser substitutes another repository, installation ID, branch, or path. | Treat all such values as untrusted; derive repository/installation from server configuration and current user-token checks; validate branch/path allowlists server-side. |
| Spoofed installation setup parameter | An attacker supplies an arbitrary `installation_id` to a setup route. | Do not trust URL installation IDs; query installations available to the authenticated user and verify the configured repository is present. |
| Unauthorized collaborator action | A future collaborator uses a token but lacks authority for this Sakka site. | Explicit role policy before enabling collaborators; verify GitHub identity and repository access; record human author in commit/PR context. |
| Stale or lost content write | An author saves an old version over newer Git content. | Capture and compare the source SHA/version; block stale writes with a clear reload/conflict path. |
| Cross-directory or unsafe file write | A crafted path writes outside the configured content root. | Canonicalize and validate paths; reject traversal, unsupported extensions, and paths outside the configured directory. |
| Duplicate publish or partial failure | A retry creates multiple commits/PRs after a timeout. | Idempotency/operation IDs; reconcile branch, commit, and PR state before retrying; make cleanup and recovery explicit. |
| Misleading author attribution | A server credential writes as a shared bot while the UI claims a human authored it. | Use a user-token-backed write or another explicit, Git-visible attribution design; include originating user in the PR body/audit record. |
| Webhook spoofing (deferred) | A forged GitHub delivery changes Sakka state. | Webhooks are out of the first slice. If introduced, require a secret and constant-time validation of `X-Hub-Signature-256`. |

## Credential-handling requirements

- The GitHub App private key and client secret, if used, must never be sent to browser code.
- The browser must never receive an installation token, user access token, or refresh token as application data.
- Access and refresh tokens must be encrypted at rest if retained beyond the request that uses them; minimize retention and support revocation.
- GitHub authorization codes are short-lived credentials: exchange them only on the server and do not log them.
- Device Flow remains useful for a local CLI/spike; the browser `/admin` flow should use authorization code with callback validation rather than expose Device Flow as its normal UX.

## Required verification before implementation

1. Test the web authorization-code flow in the chosen server runtime with exact redirect URI, `state`, and PKCE validation.
2. Prove rejection of missing, reused, expired, and mismatched `state` values.
3. Prove that a browser cannot select a different repository, branch, path, or source version than the configured and validated target.
4. Prove state-changing requests reject missing/invalid CSRF protection.
5. Prove tokens and authorization codes do not appear in browser responses, logs, test snapshots, or error messages.
6. Test an unauthorized GitHub user and a user whose App installation does not include the configured repository.
7. Test stale-write, duplicate-request, and partial-failure recovery behavior.

## ADR inputs

The credential and repository-access ADR must decide:

- whether GitHub App user tokens are the primary author-facing credential;
- when, if ever, the server may use an installation token instead;
- where the application runs and how it receives secrets;
- token/refresh-token retention and revocation policy;
- the user-to-repository authorization rule; and
- the required Git-visible attribution mechanism for collaborators.

## References

- [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [About the user authorization callback URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url)
- [About the setup URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)

