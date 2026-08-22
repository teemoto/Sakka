# GitHub App installation-token write spike

**Date:** 2026-08-22  
**Status:** Completed experiment; not a production-auth decision

## Question

Can a private GitHub App, installed only on the Aslam Bhai dogfood repository, safely perform Sakka's core repository workflow using a short-lived installation access token?

## Setup

We created a private GitHub App named **Sakka Dogfood Spike** owned by `@teemoto`.

- Installation scope: only `teemoto/aslambhai`.
- Repository permissions: metadata read; contents read/write; pull requests read/write.
- Webhooks: disabled for this spike.
- The private key was generated locally and kept outside the Sakka repository.
- The app JWT was used only to request an installation access token. The resulting token expired after one hour and was neither printed nor persisted.

This was a controlled experiment, not the production authentication or authorization design.

## Workflow proved

Using a locally generated, short-lived installation token, a one-off script successfully:

1. listed the app installations and minted an installation token;
2. verified that the token could access `teemoto/aslambhai`;
3. read the repository, `main` branch SHA, and an existing MDX article;
4. created a unique `sakka/spike-app-*` working branch from the explicit `main` SHA;
5. added a temporary Markdown fixture;
6. created a draft pull request; and
7. closed that pull request and deleted the working branch.

The temporary draft pull request was [#3](https://github.com/teemoto/aslambhai/pull/3). It was closed without merging; the branch and local spike state were removed.

## Evidence

The installation token was able to call the relevant GitHub endpoints successfully:

```text
GET    /app/installations                              → 200
POST   /app/installations/{id}/access_tokens           → 201
GET    /installation/repositories                      → 200
GET    /repos/teemoto/aslambhai                        → 200
GET    /repos/teemoto/aslambhai/git/ref/heads/main     → 200
GET    /repos/.../contents/{existing-mdx}?ref=main     → 200
POST   /repos/.../git/refs                             → 201
PUT    /repos/.../contents/{temporary-md}              → 201
POST   /repos/.../pulls                                → 201
PATCH  /repos/.../pulls/{number}                       → 200
DELETE /repos/.../git/refs/heads/{temporary-branch}    → 204
```

## Attribution finding

The generated commit was attributed to `sakka-dogfood-spike[bot]`; GitHub was the committer. The commit was GitHub-verified.

This is acceptable evidence for the owner-only dogfood spike because the one repository owner is unambiguous. It does **not** satisfy Sakka's future collaboration requirement: a shared app-bot identity does not show which individual author created a change.

When collaborators are introduced, the design must preserve the originating human in Git-visible commit metadata and pull-request context. A GitHub App user-access-token flow is one candidate to investigate; the final approach remains an ADR decision.

## What this supports

- A GitHub App can keep repository-write capability server-side and scoped to an explicitly selected repository.
- Installation tokens make the write credential short-lived.
- A GitHub App is a viable candidate for Sakka's repository-capability layer.

## What this does not decide

- How an author signs in to Sakka.
- How Sakka authorizes a signed-in person to use a repository installation.
- Whether Sakka should use GitHub App user access tokens, another user-identity mechanism, or a combination.
- How a deployed runtime securely receives and rotates the App private key.
- Webhook, session, CSRF, redirect, stale-write, retry, and failure-reconciliation behavior.
- The production branch/draft model.

## Next evidence needed

1. Run the GitHub App user-authorization/user-access-token experiment and compare its repository behavior and attribution to the installation-token result.
2. Complete the authentication and authorization threat model.
3. Make the GitHub credential and repository-access ADR before application scaffolding.

