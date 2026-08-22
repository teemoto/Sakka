# ADR 0001: Use GitHub App user access tokens for author-initiated repository work

**Status:** Accepted  
**Date:** 2026-08-22

## Context

Sakka's MVP needs an authenticated owner to read and edit configured Markdown content in a GitHub repository, save to a working branch, and create a draft pull request. Git must remain authoritative, and the resulting history must identify the originating human when collaborators are eventually supported.

Three controlled experiments were run against the Aslam Bhai dogfood repository:

- A fine-grained PAT completed the workflow but is a user-managed, long-lived credential appropriate only for local-development comparison.
- A private GitHub App installation token was scoped to the selected repository and expired after one hour, but its resulting commit was attributed to the App bot.
- A GitHub App user access token, obtained through Device Flow and then through the browser authorization-code flow, completed the workflow and produced Git-visible attribution for `@teemoto`.

The browser authorization-code-flow spike also established the minimum security shape: exact callback URL, server-owned single-use `state`, PKCE, server-side code exchange, and verification that the authorized user can access the configured App installation and repository.

## Decision

For author-initiated repository reads, saves, and pull-request creation, Sakka will use **GitHub App user access tokens obtained through the web authorization-code flow**.

The MVP will:

- use a GitHub App installed only on the configured repository;
- request only metadata read, contents read/write, and pull-requests read/write permissions;
- authenticate the author with GitHub's web authorization-code flow using exact callback validation, `state`, and PKCE;
- verify server-side that the authenticated user can access the expected App installation and configured repository before every mutation;
- keep GitHub client secrets, authorization codes, access tokens, refresh tokens, and any App private key out of browser code and logs; and
- use the user token for normal author writes so GitHub-visible commit and pull-request attribution represents the human author.

GitHub App installation tokens may be considered later for strictly server-initiated operations that do not represent an individual author. They must not be the normal credential for author-created commits or pull requests.

Device Flow was valuable for local experimentation but is not the normal `/admin` product flow. It should be disabled in the production App configuration unless a later CLI requirement justifies it.

## Alternatives considered

### Fine-grained PAT

**Rejected for production authoring.** A PAT proved the GitHub API workflow, but it is a manually created, user-managed credential. It does not provide Sakka's sign-in/session model and would require users to hand a durable bearer secret to the application.

### GitHub App installation token for all operations

**Rejected for normal authoring.** Installation tokens offer short-lived, repository-scoped capability and remain useful for non-user background work. However, the spike showed that the resulting commit is attributed to the App bot, not the initiating human. That conflicts with Sakka's collaborative authorship requirement.

### Traditional GitHub OAuth App

**Not selected.** It can identify a GitHub user, but it does not offer the same App-installation repository selection and fine-grained permission model. The GitHub App user-token experiment supplied both human attribution and the user/App/repository permission intersection required for the MVP.

### Independent Sakka identity with a shared repository credential

**Deferred and not selected for the MVP.** It would introduce a separate authorization and attribution mapping before the core Git-native workflow is proven. It may be revisited if Sakka needs identities beyond GitHub.

## Consequences

### Positive

- Author-initiated Git history identifies the authenticated GitHub user.
- Repository capability is limited by both the GitHub App's selected installation and the user's repository access.
- App permissions are fine-grained and limited to the operations Sakka needs.
- The product can use GitHub's existing account and repository permission model in the owner-only MVP.

### Costs and obligations

- Sakka needs a trusted server runtime for the authorization callback and token exchange; this ADR does not choose that runtime.
- The runtime must securely store the GitHub App client secret and, if tokens are retained, encrypt access/refresh tokens with rotation and revocation support.
- The application must implement browser-session protection, callback `state`, PKCE, CSRF protection for writes, exact redirect validation, and safe logging.
- The user/App/repository authorization check must run server-side; browser-supplied repository IDs, paths, branches, versions, and installation IDs are untrusted input.
- The initial App setup and deployment secret-delivery model require separate runtime/operations decisions.
- The observed user-token commit was not GitHub-verified. Commit-signing requirements remain a future audit decision.

### Explicitly not decided here

- Application framework, server runtime, deployment model, and session library.
- Access/refresh-token database schema, encryption mechanism, or retention duration.
- Working-branch/draft semantics, save grouping, and publish/recovery behavior.
- Collaborator roles and multi-repository configuration.
- Webhooks and background synchronization.

## Follow-up work

1. Decide the MVP application/runtime and deployment model, including server-side secret delivery.
2. Implement and test the authorization-code flow in that runtime, including browser-level negative callback, session, and CSRF tests.
3. Decide token retention, refresh, revocation, and logout behavior.
4. Decide working-branch, stale-write, and partial-failure recovery semantics.
5. Disable Device Flow in the production App configuration unless a later CLI requirement is accepted.

## Evidence

- [PAT write spike](../../research/github-pat-write-spike.md)
- [GitHub App installation-token spike](../../research/github-app-installation-token-spike.md)
- [GitHub App user-token spike](../../research/github-app-user-access-token-spike.md)
- [GitHub App web authorization-code-flow spike](../../research/github-app-web-authorization-code-flow-spike.md)
- [Authentication and authorization threat model](../../research/authentication-authorization-threat-model.md)

